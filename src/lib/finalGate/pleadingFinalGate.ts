import type { ApprovalContext } from '../../domain/workflow/authorization';
import { AuthorizationPolicy } from '../../domain/workflow/authorization';
import type {
  CaseInput,
  ComplianceFinding,
  FinalDeliveryAuditItem,
  FinalGateBlocker,
  FinalGateReport,
  HumanEditRecord,
  HumanOverride,
  IndependentReReviewReport,
  LegalReference,
  PleadingRevisionRecord,
  PleadingRuleProfile,
  StructuredPleadingDraft
} from '../../types/compliance';
import { buildFreshReviewInput } from '../reviewer/independentReReviewer';
import { fingerprintReviewPayload, reviewStructuredPleading } from '../reviewer/pleadingReviewer';

export const PLEADING_FINAL_GATE_VERSION = '1.0.0';

export interface FinalGateHumanOverrideRequest {
  context: ApprovalContext;
  reason: string;
  overriddenFindings: Array<{ id: string; fingerprint: string }>;
  scope: { gateInputFingerprint: string };
}

export interface PleadingFinalGateInput {
  draft: StructuredPleadingDraft;
  caseInput: CaseInput;
  ruleProfile: PleadingRuleProfile;
  legalReferences: LegalReference[];
  revisionRecords: PleadingRevisionRecord[];
  independentReReviewReport: IndependentReReviewReport;
  humanEditRecord?: HumanEditRecord;
  humanOverride?: FinalGateHumanOverrideRequest;
}

type RawBlocker = Omit<FinalGateBlocker, 'fingerprint'>;

type FindingProblemStatus = Extract<FinalGateBlocker['status'], ComplianceFinding['status']>;

function isProblem(status: ComplianceFinding['status']): status is FindingProblemStatus {
  return status === 'MISSING' || status === 'CONFLICT' || status === 'UNVERIFIED';
}

function audit(
  id: `Q${string}`,
  question: string,
  known: boolean,
  answer: unknown,
  evidence: string[]
): FinalDeliveryAuditItem {
  return known
    ? { id, question, status: 'ANSWERED', answer, evidence }
    : { id, question, status: 'UNKNOWN', evidence };
}

function revisionChainValid(records: PleadingRevisionRecord[], finalDraftId: string): boolean {
  return records.length > 0 &&
    records.every((record, index) =>
      record.fromDraftId !== record.toDraftId &&
      (index === 0 || records[index - 1].toDraftId === record.fromDraftId)
    ) &&
    records.at(-1)?.toDraftId === finalDraftId;
}

function samePairs(
  actual: Array<{ id: string; fingerprint: string }>,
  expected: Array<{ id: string; fingerprint: string }>
): boolean {
  const key = (item: { id: string; fingerprint: string }) => `${item.id}|${item.fingerprint}`;
  return actual.length === new Set(actual.map(key)).size &&
    actual.length === expected.length &&
    expected.every(item => actual.some(candidate => key(candidate) === key(item)));
}

async function withFingerprints(blockers: RawBlocker[]): Promise<FinalGateBlocker[]> {
  return Promise.all(blockers.map(async blocker => ({
    ...blocker,
    fingerprint: await fingerprintReviewPayload(blocker)
  })));
}

export async function evaluateFinalGate(rawInput: PleadingFinalGateInput): Promise<FinalGateReport> {
  const input = structuredClone(rawInput);
  const gateInputFingerprint = await fingerprintReviewPayload({
    draft: input.draft,
    caseInput: input.caseInput,
    ruleProfile: input.ruleProfile,
    legalReferences: input.legalReferences,
    revisionRecords: input.revisionRecords,
    independentReReviewReport: input.independentReReviewReport,
    humanEditRecord: input.humanEditRecord
  });
  const freshReviewInput = buildFreshReviewInput(
    input.draft, input.caseInput, input.ruleProfile, input.legalReferences
  );
  const complianceFindings = freshReviewInput.complianceFindings || [];
  const reviewerReport = await reviewStructuredPleading(freshReviewInput);
  const rawBlockers: RawBlocker[] = [];
  const add = (blocker: RawBlocker) => rawBlockers.push(blocker);

  complianceFindings.filter(finding => isProblem(finding.status)).forEach(finding => add({
    id: `P5:RULE:${input.ruleProfile.id}:${finding.ruleId}`,
    source: 'P5',
    status: finding.status as FinalGateBlocker['status'],
    message: finding.note || `P5 finding ${finding.ruleId} 未通過。`,
    overrideEligible: finding.status !== 'UNVERIFIED'
  }));
  reviewerReport.findings.filter(finding => isProblem(finding.status)).forEach(finding => add({
    id: `P6:${finding.id}`,
    source: 'P6',
    status: finding.status as FinalGateBlocker['status'],
    message: finding.note || `P6 finding ${finding.id} 未通過。`,
    overrideEligible: finding.category === 'LEGAL_CONTENT' && finding.status !== 'UNVERIFIED'
  }));
  input.independentReReviewReport.checks.filter(check => isProblem(check.status)).forEach(check => add({
    id: `P8:${check.id}`,
    source: 'P8',
    status: check.status as FinalGateBlocker['status'],
    message: check.note,
    overrideEligible: false
  }));

  const requiredRuleIds = new Set(input.ruleProfile.rules
    .filter(rule => rule.level === 'REQUIRED' && rule.appliesTo.includes(input.caseInput.caseType) &&
      (!rule.pleadingTypes || rule.pleadingTypes.includes(input.caseInput.pleadingType)))
    .map(rule => rule.id));
  (input.draft.missingInputs || [])
    .filter(item => item.severity === 'BLOCKING' || Boolean(item.sourceRequirement && requiredRuleIds.has(item.sourceRequirement)))
    .forEach(item => add({
      id: `INPUT:${encodeURIComponent(item.field)}:${encodeURIComponent(item.sourceRequirement || 'NONE')}:${[...item.requiredFor].sort().join(',')}`,
      source: 'INPUT',
      status: 'MISSING',
      message: item.reason,
      overrideEligible: item.category === 'LEGAL_COMPLETENESS' && item.severity !== 'BLOCKING'
    }));

  input.legalReferences.forEach(reference => {
    if (reference.verificationStatus !== 'VERIFIED' || !reference.contentHash?.trim()) add({
      id: `INTEGRITY:LEGAL_REFERENCE:${encodeURIComponent(reference.sourceReference)}`,
      source: 'INTEGRITY',
      status: 'UNVERIFIED',
      message: 'Legal Reference 未驗證或缺少 contentHash。',
      overrideEligible: false
    });
  });
  if (!revisionChainValid(input.revisionRecords, input.draft.id) ||
      input.revisionRecords.at(-1)?.findingId !== input.independentReReviewReport.revisionFindingId) {
    add({
      id: 'INTEGRITY:REVISION_CHAIN', source: 'INTEGRITY', status: 'CONFLICT',
      message: 'Revision Record ID chain 與最終 draft/P8 不一致。', overrideEligible: false
    });
  }
  const p8Consistent =
    input.independentReReviewReport.revisedDraftId === input.draft.id &&
    input.independentReReviewReport.revisedReviewReport.draftFingerprint === reviewerReport.draftFingerprint &&
    input.independentReReviewReport.allChecksPassed ===
      input.independentReReviewReport.checks.every(check => check.status === 'COMPLIANT') &&
    await fingerprintReviewPayload(input.independentReReviewReport.revisedReviewReport) ===
      await fingerprintReviewPayload(reviewerReport);
  if (!p8Consistent) add({
    id: 'INTEGRITY:P8_REPORT', source: 'INTEGRITY', status: 'CONFLICT',
    message: 'P8 report 未綁定目前最終 draft 或 fresh P6 report。', overrideEligible: false
  });

  const edit = input.humanEditRecord;
  if (edit && (
    (!edit.occurred && (edit.kind !== 'NONE' || edit.fields.length > 0)) ||
    (edit.occurred && edit.kind === 'NONE')
  )) add({
    id: 'EDIT:RECORD_CONFLICT', source: 'EDIT', status: 'CONFLICT',
    message: 'Human edit record 欄位互相衝突。', overrideEligible: false
  });
  if (edit?.occurred && edit.kind === 'SUBSTANTIVE' &&
      edit.reviewedDraftFingerprint !== reviewerReport.draftFingerprint) add({
    id: 'EDIT:SUBSTANTIVE_RE_REVIEW_REQUIRED', source: 'EDIT', status: 'UNVERIFIED',
    message: '實質人工修改尚未綁定最終 draft 的 Independent Re-Review。', overrideEligible: false
  });
  if (edit?.occurred && edit.kind === 'FORMAT_ONLY') add({
    id: 'EDIT:FORMAT_ARTIFACT_VERIFIER_UNAVAILABLE', source: 'EDIT', status: 'UNVERIFIED',
    message: '目前沒有核准的 export artifact 格式驗證器。', overrideEligible: false
  });

  const auditItems: FinalDeliveryAuditItem[] = [
    audit('Q01', '這是什麼書狀？', Boolean(input.draft.pleadingType), input.draft.pleadingType, ['draft.pleadingType']),
    audit('Q02', '為什麼使用這個骨架？', Boolean(input.draft.structure.id), {
      caseType: input.draft.caseType, pleadingType: input.draft.pleadingType
    }, ['draft.structure.id', 'draft.caseType', 'draft.pleadingType']),
    audit('Q03', '骨架來源？', Boolean(input.ruleProfile.sourceReference), input.ruleProfile.sourceReference, ['ruleProfile.sourceReference']),
    audit('Q04', 'Rule Profile 版本？', Boolean(input.ruleProfile.version), input.ruleProfile.version, ['ruleProfile.version']),
    audit('Q05', 'Legal Reference 版本？', input.legalReferences.length > 0 && input.legalReferences.every(item => Boolean(item.sourceReference && item.contentHash)),
      input.legalReferences.map(item => ({ sourceReference: item.sourceReference, contentHash: item.contentHash })), ['legalReferences']),
    audit('Q06', '使用了哪些 Facts？', Array.isArray(input.draft.factsUsed), input.draft.factsUsed, ['draft.factsUsed']),
    audit('Q07', '使用了哪些 Evidence？', Array.isArray(input.draft.evidenceUsed), input.draft.evidenceUsed, ['draft.evidenceUsed']),
    audit('Q08', '哪些 Facts 沒使用？', Array.isArray(input.draft.factsUnused), input.draft.factsUnused, ['draft.factsUnused']),
    audit('Q09', '哪些 Evidence 沒使用？', Array.isArray(input.draft.evidenceUnused), input.draft.evidenceUnused, ['draft.evidenceUnused']),
    audit('Q10', '有哪些 missingInputs？', Array.isArray(input.draft.missingInputs), input.draft.missingInputs, ['draft.missingInputs']),
    audit('Q11', 'Compliance Findings？', true, complianceFindings, ['fresh P5']),
    audit('Q12', 'Reviewer Findings？', true, reviewerReport.findings, ['fresh P6']),
    audit('Q13', 'Revision 做了什麼？', input.revisionRecords.length > 0, input.revisionRecords, ['revisionRecords']),
    audit('Q14', 'Independent Re-Review 結果？', true, input.independentReReviewReport, ['independentReReviewReport']),
    audit('Q15', '是否有人為修改？', Boolean(edit), edit, ['humanEditRecord']),
    audit('Q16', '是否重新 Review？', p8Consistent, p8Consistent, ['fresh P6', 'independentReReviewReport'])
  ];
  auditItems.filter(item => item.status === 'UNKNOWN').forEach(item => add({
    id: `AUDIT:${item.id}`, source: 'AUDIT', status: 'UNKNOWN',
    message: `${item.id} 無法回答。`, overrideEligible: false
  }));

  let blockers = await withFingerprints(rawBlockers);
  const duplicateBlockerIds = blockers.map(item => item.id).filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateBlockerIds.length) {
    blockers = await withFingerprints([...rawBlockers, {
      id: 'INTEGRITY:DUPLICATE_BLOCKER_ID', source: 'INTEGRITY', status: 'CONFLICT',
      message: `Canonical blocker ID 重複：${[...new Set(duplicateBlockerIds)].join(', ')}`, overrideEligible: false
    }]);
  }

  let status: FinalGateReport['status'] = blockers.length ? 'BLOCKED' : 'READY';
  let appliedOverride: HumanOverride | undefined;
  if (input.humanOverride) {
    if (!blockers.length) throw new Error('Human Override cannot be applied when Final Gate has no blockers.');
    if (
      input.humanOverride.context.source !== 'TRUSTED_AUTH_PROVIDER' ||
      !Number.isFinite(Date.parse(input.humanOverride.context.timestamp))
    ) {
      throw new Error('Human Override requires a current trusted authentication context.');
    }
    AuthorizationPolicy.assertHumanGateApprover(input.humanOverride.context, 'P9 Final Gate Override');
    const eligible = blockers.filter(blocker => blocker.overrideEligible)
      .map(({ id, fingerprint }) => ({ id, fingerprint }));
    const valid = blockers.length > 0 &&
      blockers.every(blocker => blocker.overrideEligible) &&
      input.humanOverride.scope.gateInputFingerprint === gateInputFingerprint &&
      Boolean(input.humanOverride.reason.trim()) &&
      samePairs(input.humanOverride.overriddenFindings, eligible);
    if (valid) {
      status = 'BLOCKED_WITH_HUMAN_OVERRIDE';
      appliedOverride = {
        reviewerId: input.humanOverride.context.actorId,
        reviewerRole: input.humanOverride.context.role,
        approvedAt: input.humanOverride.context.timestamp,
        reason: input.humanOverride.reason,
        overriddenFindings: input.humanOverride.overriddenFindings,
        scope: input.humanOverride.scope
      };
    }
  }

  auditItems.push(
    audit('Q17', '最終 Gate 狀態？', true, status, ['finalGate.status']),
    audit('Q18', '是否存在 Human Override？', true, appliedOverride || false, ['finalGate.override']),
    audit('Q19', 'Export Version Snapshot？', true, {
      state: 'NOT_CREATED_PRE_GATE_BY_POLICY',
      nextAction: 'CREATE_VERSION_SNAPSHOT_AFTER_READY'
    }, ['Final Gate → Export + Version Lock']),
    audit('Q20', '為什麼可以交付？', true,
      status === 'READY'
        ? '所有 fresh checks 與 20 題 audit 已回答且無 blocker。'
        : status === 'BLOCKED_WITH_HUMAN_OVERRIDE'
          ? '非 READY；僅可在另一個可信 HUMAN DEPLOY gate 後匯出。'
          : `不可交付；仍有 ${blockers.length} 個 blocker。`,
      ['finalGate.status', 'finalGate.blockers'])
  );

  return {
    status,
    evaluatorVersion: PLEADING_FINAL_GATE_VERSION,
    gateInputFingerprint,
    blockers,
    auditItems,
    complianceFindings,
    reviewerReport,
    independentReReviewReport: input.independentReReviewReport,
    override: appliedOverride,
    exportPolicy: status === 'READY'
      ? 'READY_ONLY'
      : status === 'BLOCKED_WITH_HUMAN_OVERRIDE'
        ? 'HUMAN_DEPLOY_REQUIRED_FOR_OVERRIDE'
        : 'NOT_EXPORTABLE'
  };
}
