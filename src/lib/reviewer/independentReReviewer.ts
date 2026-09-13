import type {
  CaseInput,
  ComplianceStatus,
  IndependentReReviewCheck,
  IndependentReReviewReport,
  LegalReference,
  PleadingReviewReport,
  PleadingRevisionRecord,
  PleadingRuleProfile,
  ReviewFinding,
  StructuredPleadingDraft
} from '../../types/compliance';
import { verifyPleadingCompliance } from '../compliance/pleadingComplianceEngine';
import { verifyGenerationTemplate } from '../compliance/generationTemplateVerifier';
import { verifyGeneratedDocument } from '../generatedDocumentPipeline';
import { FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';
import {
  fingerprintReviewPayload,
  PLEADING_REVIEWER_VERSION,
  reviewStructuredPleading,
  type PleadingReviewInput
} from './pleadingReviewer';

export const INDEPENDENT_RE_REVIEWER_VERSION = '1.0.0';

export interface IndependentReReviewInput {
  originalDraft: StructuredPleadingDraft;
  revisedDraft: StructuredPleadingDraft;
  caseInput: CaseInput;
  ruleProfile: PleadingRuleProfile;
  legalReferences: LegalReference[];
  originalReviewReport: PleadingReviewReport;
  revisionRecord: PleadingRevisionRecord;
}

function isProblem(status: ComplianceStatus): boolean {
  return status === 'MISSING' || status === 'CONFLICT' || status === 'UNVERIFIED';
}

function oneFinding(findings: ReviewFinding[], findingId: string): ReviewFinding {
  const matches = findings.filter(finding => finding.id === findingId);
  if (matches.length !== 1) throw new Error(`Independent re-review requires one unique Finding ID ${findingId}.`);
  return matches[0];
}

function assertUniqueFindingIds(report: PleadingReviewReport): void {
  const ids = report.findings.map(finding => finding.id);
  if (new Set(ids).size !== ids.length) throw new Error('Reviewer report contains duplicate stable Finding IDs.');
}

export function buildFreshReviewInput(
  draft: StructuredPleadingDraft,
  caseInput: CaseInput,
  ruleProfile: PleadingRuleProfile,
  legalReferences: LegalReference[]
): PleadingReviewInput {
  const documentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  const appliedFormatProfile = FORMAT_PROFILES[ruleProfile.formatProfileId || caseInput.caseType];
  return {
    draft,
    caseInput,
    ruleProfile,
    complianceFindings: verifyPleadingCompliance({ draft, caseInput, ruleProfile, legalReferences }),
    citationVerification: verifyGeneratedDocument(documentText),
    formatFinding: verifyGenerationTemplate(caseInput.caseType, appliedFormatProfile),
    appliedFormatProfile
  };
}

function allowedChangedPaths(record: PleadingRevisionRecord): string[] {
  if (record.operation === 'RESTORE_SECTION_FROM_APPROVED_INPUT' && record.targetSectionId) {
    return [
      `sections.${record.targetSectionId}.content`,
      `sections.${record.targetSectionId}.sourceClaimIds`,
      `sections.${record.targetSectionId}.sourceFactIds`,
      `sections.${record.targetSectionId}.sourceEvidenceIds`,
      'id'
    ];
  }
  if (record.operation === 'RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE' && record.targetSectionId) {
    return ['sectionType', 'title', 'ruleIds', 'requirementLevels'].flatMap(field => [
      `structure.sections.${record.targetSectionId}.${field}`,
      `sections.${record.targetSectionId}.${field}`
    ]).concat('id');
  }
  if (record.operation === 'REBUILD_NEGATIVE_PROOF' && record.negativeProofScope === 'SOURCE_USAGE') {
    return ['claimsUsed', 'claimsUnused', 'factsUsed', 'factsUnused', 'evidenceUsed', 'evidenceUnused', 'id'];
  }
  if (record.operation === 'REBUILD_NEGATIVE_PROOF' && record.negativeProofScope === 'OMITTED_SECTIONS') {
    return ['omittedSectionIds', 'id'];
  }
  throw new Error('Revision record does not contain a valid scoped target.');
}

function pathValue(draft: StructuredPleadingDraft, path: string): unknown {
  const parts = path.split('.');
  if (parts[0] === 'sections' && parts.length === 3) {
    return draft.sections.find(section => section.id === parts[1])?.[parts[2] as keyof typeof draft.sections[number]];
  }
  if (parts[0] === 'structure' && parts[1] === 'sections' && parts.length === 4) {
    return draft.structure.sections.find(section => section.id === parts[2])?.[
      parts[3] as keyof typeof draft.structure.sections[number]
    ];
  }
  if (parts.length === 1 && Object.hasOwn(draft, path)) return draft[path as keyof StructuredPleadingDraft];
  throw new Error(`Unsupported revision path ${path}.`);
}

function setPathValue(draft: StructuredPleadingDraft, path: string, value: unknown): void {
  const parts = path.split('.');
  if (parts[0] === 'sections' && parts.length === 3) {
    const section = draft.sections.find(item => item.id === parts[1]);
    if (!section) throw new Error(`Missing revised section ${parts[1]}.`);
    section[parts[2] as keyof typeof section] = structuredClone(value) as never;
    return;
  }
  if (parts[0] === 'structure' && parts[1] === 'sections' && parts.length === 4) {
    const section = draft.structure.sections.find(item => item.id === parts[2]);
    if (!section) throw new Error(`Missing revised structure section ${parts[2]}.`);
    section[parts[3] as keyof typeof section] = structuredClone(value) as never;
    return;
  }
  if (parts.length === 1 && Object.hasOwn(draft, path)) {
    draft[path as keyof StructuredPleadingDraft] = structuredClone(value) as never;
    return;
  }
  throw new Error(`Unsupported revision path ${path}.`);
}

async function assertRevisionScope(input: IndependentReReviewInput): Promise<void> {
  const { originalDraft, revisedDraft, caseInput, ruleProfile, originalReviewReport, revisionRecord } = input;
  if (
    originalReviewReport.draftId !== originalDraft.id ||
    originalReviewReport.caseInputId !== caseInput.id ||
    originalReviewReport.ruleProfileId !== ruleProfile.id ||
    originalReviewReport.ruleProfileVersion !== ruleProfile.version ||
    originalReviewReport.reviewerVersion !== PLEADING_REVIEWER_VERSION ||
    revisionRecord.fromDraftId !== originalDraft.id ||
    revisionRecord.toDraftId !== revisedDraft.id ||
    revisionRecord.sourceCaseInputId !== caseInput.id ||
    revisionRecord.sourceRuleProfileId !== ruleProfile.id ||
    revisionRecord.sourceRuleProfileVersion !== ruleProfile.version ||
    revisionRecord.requiresIndependentReview !== true ||
    originalReviewReport.draftFingerprint !== await fingerprintReviewPayload(originalDraft) ||
    originalReviewReport.caseInputFingerprint !== await fingerprintReviewPayload(caseInput) ||
    originalReviewReport.ruleProfileFingerprint !== await fingerprintReviewPayload(ruleProfile)
  ) {
    throw new Error('Independent re-review payload or revision bindings do not match.');
  }

  const allowed = allowedChangedPaths(revisionRecord);
  const changed = revisionRecord.changedPaths;
  if (
    changed.length !== new Set(changed).size ||
    !changed.length ||
    !changed.includes('id') ||
    changed.some(path => !allowed.includes(path))
  ) {
    throw new Error('Revision record contains unscoped changed paths.');
  }
  const reconstructed = structuredClone(originalDraft);
  for (const path of changed) {
    const before = pathValue(originalDraft, path);
    const after = pathValue(revisedDraft, path);
    if (JSON.stringify(before) === JSON.stringify(after)) throw new Error(`Revision path ${path} is a no-op.`);
    setPathValue(reconstructed, path, after);
  }
  if (await fingerprintReviewPayload(reconstructed) !== await fingerprintReviewPayload(revisedDraft)) {
    throw new Error('Revised draft contains changes outside the recorded Finding scope.');
  }
}

function check(id: IndependentReReviewCheck['id'], compliant: boolean, note: string): IndependentReReviewCheck {
  return {
    id,
    status: compliant ? 'COMPLIANT' : 'CONFLICT',
    objectiveBasis: [id, 'fresh P5/P6/citation/format verification', 'P7 revision record'],
    note
  };
}

export async function independentlyReReview(rawInput: IndependentReReviewInput): Promise<IndependentReReviewReport> {
  const input = structuredClone(rawInput);
  await assertRevisionScope(input);
  const originalRecomputed = await reviewStructuredPleading(buildFreshReviewInput(
    input.originalDraft, input.caseInput, input.ruleProfile, input.legalReferences
  ));
  if (await fingerprintReviewPayload(originalRecomputed) !== await fingerprintReviewPayload(input.originalReviewReport)) {
    throw new Error('Original Reviewer report does not match independently recomputed verifier evidence.');
  }
  assertUniqueFindingIds(originalRecomputed);
  const original = oneFinding(originalRecomputed.findings, input.revisionRecord.findingId);
  if (original.status !== 'MISSING' && original.status !== 'CONFLICT') {
    throw new Error('P8 requires an original confirmed MISSING or CONFLICT finding.');
  }

  const revisedReviewReport = await reviewStructuredPleading(buildFreshReviewInput(
    input.revisedDraft, input.caseInput, input.ruleProfile, input.legalReferences
  ));
  assertUniqueFindingIds(revisedReviewReport);
  const currentTarget = oneFinding(revisedReviewReport.findings, original.id);
  const originalById = new Map(originalRecomputed.findings.map(item => [item.id, item]));
  const newProblems = revisedReviewReport.findings.filter(item => {
    if (!isProblem(item.status)) return false;
    const previous = originalById.get(item.id);
    return !previous || !isProblem(previous.status) || previous.status !== item.status;
  });
  const factFindings = revisedReviewReport.findings.filter(item => item.id === 'P6.FACTS.TRACEABILITY');
  const brokenPreviousRules = originalRecomputed.findings
    .filter(item => item.id !== original.id && !isProblem(item.status))
    .filter(item => {
      const matches = revisedReviewReport.findings.filter(current => current.id === item.id);
      return matches.length !== 1 || isProblem(matches[0].status);
    });

  const checks: IndependentReReviewCheck[] = [
    check(
      'P8.ORIGINAL_FINDING',
      !isProblem(currentTarget.status),
      !isProblem(currentTarget.status) ? '原 Finding 已不再呈現問題狀態。' : '原 Finding 仍未解除。'
    ),
    check(
      'P8.NO_NEW_FINDINGS',
      newProblems.length === 0,
      newProblems.length ? `新增或變質問題：${newProblems.map(item => item.id).join(', ')}` : '未發現修訂後新增或變質的問題 finding。'
    ),
    check(
      'P8.NO_FABRICATION',
      factFindings.length === 1 &&
        factFindings[0].category === 'FACT_CONSISTENCY' &&
        factFindings[0].source === 'REVIEWER' &&
        factFindings[0].status === 'COMPLIANT',
      factFindings.length === 1 && factFindings[0].status === 'COMPLIANT'
        ? '修訂稿事實、支持鏈、來源與 negative proof 均可回查。'
        : '修訂稿仍無法排除虛構內容或來源不一致。'
    ),
    check(
      'P8.OTHER_RULES_PRESERVED',
      brokenPreviousRules.length === 0,
      brokenPreviousRules.length
        ? `原先非問題 finding 遭破壞：${brokenPreviousRules.map(item => item.id).join(', ')}`
        : '其他原先非問題 finding 未被破壞。'
    )
  ];

  return {
    originalDraftId: input.originalDraft.id,
    revisedDraftId: input.revisedDraft.id,
    revisionFindingId: input.revisionRecord.findingId,
    reReviewerVersion: INDEPENDENT_RE_REVIEWER_VERSION,
    checks,
    revisedReviewReport,
    allChecksPassed: checks.every(item => item.status === 'COMPLIANT')
  };
}
