import { describe, expect, it } from 'vitest';
import type { ApprovalContext } from '../../domain/workflow/authorization';
import type { CaseInput, LegalReference } from '../../types/compliance';
import { verifyPleadingCompliance } from '../compliance/pleadingComplianceEngine';
import { verifyGenerationTemplate } from '../compliance/generationTemplateVerifier';
import { verifyGeneratedDocument } from '../generatedDocumentPipeline';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { independentlyReReview } from '../reviewer/independentReReviewer';
import { reviewStructuredPleading } from '../reviewer/pleadingReviewer';
import { applyPleadingRevision } from '../revision/pleadingRevision';
import { CIVIL_CONTENT_RULE_PROFILE, FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';
import { evaluateFinalGate, type PleadingFinalGateInput } from './pleadingFinalGate';

const verifiedReferences: LegalReference[] = [
  { sourceReference: 'legal_references/civil_procedure_116.md', verificationStatus: 'VERIFIED', contentHash: '116'.padEnd(64, '0') },
  { sourceReference: 'legal_references/civil_procedure_117.md', verificationStatus: 'VERIFIED', contentHash: '117'.padEnd(64, '0') },
  { sourceReference: 'legal_references/civil_procedure_244.md', verificationStatus: 'VERIFIED', contentHash: '244'.padEnd(64, '0') }
];

function completeInput(overrides: Partial<CaseInput> = {}): CaseInput {
  return {
    id: 'case-1', caseType: 'civil', pleadingType: 'complaint', styleProfile: 'civil_complaint',
    parties: [
      { id: 'party-1', role: 'claimant', name: '原告甲', address: '原告地址' },
      { id: 'party-2', role: 'respondent', name: '被告乙', address: '被告地址' }
    ],
    facts: [{ id: 'fact-1', content: '被告未履行契約。', sourceLevel: 'EVIDENCE_BACKED', evidenceIds: ['evidence-1'] }],
    claims: [{ id: 'claim-1', statement: '被告應給付原告。', factIds: ['fact-1'], evidenceIds: ['evidence-1'] }],
    evidence: [{ id: 'evidence-1', content: '契約書' }],
    attachments: [{ id: 'attachment-1', content: '契約書影本' }],
    proceeding: '損害賠償事件', court: '臺灣某地方法院', documentDate: '2026-09-13', signature: '原告甲',
    ...overrides
  };
}

async function originalReview(
  draft: ReturnType<typeof buildStructuredPleadingDraft>,
  caseInput: CaseInput,
  legalReferences: LegalReference[]
) {
  const documentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  return reviewStructuredPleading({
    draft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    complianceFindings: verifyPleadingCompliance({ draft, caseInput, ruleProfile: CIVIL_CONTENT_RULE_PROFILE, legalReferences }),
    citationVerification: verifyGeneratedDocument(documentText),
    formatFinding: verifyGenerationTemplate('civil', FORMAT_PROFILES.civil),
    appliedFormatProfile: FORMAT_PROFILES.civil
  });
}

async function scenario(
  caseInput = completeInput(),
  legalReferences = verifiedReferences
): Promise<PleadingFinalGateInput> {
  const originalDraft = buildStructuredPleadingDraft(caseInput);
  originalDraft.sections.find(section => section.id === 'statements')!.content += '\n虛構自認。';
  const report = await originalReview(originalDraft, caseInput, legalReferences);
  const revision = await applyPleadingRevision({
    draft: originalDraft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    reviewReport: report,
    request: {
      findingId: 'P6.FACTS.TRACEABILITY',
      operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT',
      targetSectionId: 'statements'
    }
  });
  const p8 = await independentlyReReview({
    originalDraft,
    revisedDraft: revision.draft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences,
    originalReviewReport: report,
    revisionRecord: revision.record
  });
  return {
    draft: revision.draft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences,
    revisionRecords: [revision.record],
    independentReReviewReport: p8,
    humanEditRecord: { occurred: false, kind: 'NONE', fields: [] }
  };
}

function humanContext(overrides: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    actorId: 'human-approver', actorType: 'HUMAN', role: 'APPROVER', name: '審查人',
    source: 'TRUSTED_AUTH_PROVIDER', timestamp: '2026-09-13T06:00:00.000Z', ...overrides
  };
}

describe('evaluateFinalGate', () => {
  it('returns READY only after fresh checks and all 20 audit answers succeed', async () => {
    const result = await evaluateFinalGate(await scenario());

    expect(result.status).toBe('READY');
    expect(result.blockers).toEqual([]);
    expect(result.auditItems).toHaveLength(20);
    expect(result.auditItems.every(item => item.status === 'ANSWERED')).toBe(true);
    expect(result.exportPolicy).toBe('READY_ONLY');
    expect(result.auditItems.find(item => item.id === 'Q19')?.answer).toEqual({
      state: 'NOT_CREATED_PRE_GATE_BY_POLICY', nextAction: 'CREATE_VERSION_SNAPSHOT_AFTER_READY'
    });
  });

  it('does not mutate Final Gate inputs', async () => {
    const input = await scenario();
    const before = structuredClone(input);
    await evaluateFinalGate(input);
    expect(input).toEqual(before);
  });

  it('blocks a REQUIRED legal-completeness omission while preserving WARNING findings', async () => {
    const input = completeInput({ court: undefined });
    const result = await evaluateFinalGate(await scenario(input));

    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: expect.stringContaining('CIVIL_116_7'), status: 'MISSING' })
    ]));
    expect(result.complianceFindings.find(item => item.ruleId === 'CIVIL_116_RECOMMENDED_IDENTIFIERS')?.status).toBe('WARNING');
  });

  it.each([
    [{ verificationStatus: 'UNVERIFIED' as const, contentHash: 'hash' }, 'UNVERIFIED'],
    [{ verificationStatus: 'VERIFIED' as const, contentHash: '' }, 'UNVERIFIED']
  ])('blocks an invalid frozen Legal Reference %#', async (reference, status) => {
    const refs: LegalReference[] = verifiedReferences.map((item, index) => index ? item : { ...item, ...reference });
    const result = await evaluateFinalGate(await scenario(completeInput(), refs));
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContainEqual(expect.objectContaining({ source: 'INTEGRITY', status }));
  });

  it('blocks a tampered P8 report even when allChecksPassed remains true', async () => {
    const input = await scenario();
    input.independentReReviewReport.revisedReviewReport.findings[0].note = '遭竄改';
    const result = await evaluateFinalGate(input);
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: 'INTEGRITY:P8_REPORT' }));
  });

  it('blocks an inconsistent P8 aggregate flag', async () => {
    const input = await scenario();
    input.independentReReviewReport.allChecksPassed = false;
    const result = await evaluateFinalGate(input);
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: 'INTEGRITY:P8_REPORT' }));
  });

  it('blocks a broken Revision Record chain', async () => {
    const input = await scenario();
    input.revisionRecords[0].toDraftId = 'other';
    const result = await evaluateFinalGate(input);
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: 'INTEGRITY:REVISION_CHAIN' }));
  });

  it('marks missing human-edit evidence UNKNOWN and non-overridable', async () => {
    const input = await scenario();
    delete input.humanEditRecord;
    const result = await evaluateFinalGate(input);
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: 'AUDIT:Q15', status: 'UNKNOWN', overrideEligible: false }));
  });

  it('blocks contradictory or unreviewed substantive edits', async () => {
    const contradictory = await scenario();
    contradictory.humanEditRecord = { occurred: false, kind: 'SUBSTANTIVE', fields: ['content'] };
    expect((await evaluateFinalGate(contradictory)).blockers).toContainEqual(expect.objectContaining({ id: 'EDIT:RECORD_CONFLICT' }));

    const unreviewed = await scenario();
    unreviewed.humanEditRecord = { occurred: true, kind: 'SUBSTANTIVE', fields: ['content'], reviewedDraftFingerprint: 'stale' };
    expect((await evaluateFinalGate(unreviewed)).blockers).toContainEqual(expect.objectContaining({ id: 'EDIT:SUBSTANTIVE_RE_REVIEW_REQUIRED' }));
  });

  it('accepts a substantive-edit record only when P8 reviewed the exact final draft', async () => {
    const input = await scenario();
    input.humanEditRecord = {
      occurred: true,
      kind: 'SUBSTANTIVE',
      fields: ['content'],
      reviewedDraftFingerprint: input.independentReReviewReport.revisedReviewReport.draftFingerprint
    };
    expect((await evaluateFinalGate(input)).status).toBe('READY');
  });

  it('blocks format-only edits while no approved artifact verifier exists', async () => {
    const input = await scenario();
    input.humanEditRecord = { occurred: true, kind: 'FORMAT_ONLY', fields: ['fontSize'], artifactFingerprint: 'artifact' };
    const result = await evaluateFinalGate(input);
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: 'EDIT:FORMAT_ARTIFACT_VERIFIER_UNAVAILABLE' }));
  });

  it.each([
    ['AI', 'APPROVER'],
    ['SYSTEM', 'APPROVER'],
    ['HUMAN', 'VERIFIER']
  ] as const)('rejects unauthorized override actor %s/%s', async (actorType, role) => {
    const input = await scenario(completeInput({ court: undefined }));
    const blocked = await evaluateFinalGate(input);
    input.humanOverride = {
      context: humanContext({ actorType, role }), reason: '人工承擔風險',
      overriddenFindings: blocked.blockers.filter(item => item.overrideEligible).map(({ id, fingerprint }) => ({ id, fingerprint })),
      scope: { gateInputFingerprint: blocked.gateInputFingerprint }
    };
    await expect(evaluateFinalGate(input)).rejects.toThrow();
  });

  it('rejects untrusted or invalid-time Human Override context', async () => {
    const input = await scenario(completeInput({ court: undefined }));
    const blocked = await evaluateFinalGate(input);
    const request = {
      reason: '人工承擔風險',
      overriddenFindings: blocked.blockers.filter(item => item.overrideEligible).map(({ id, fingerprint }) => ({ id, fingerprint })),
      scope: { gateInputFingerprint: blocked.gateInputFingerprint }
    };
    await expect(evaluateFinalGate({
      ...input, humanOverride: { ...request, context: humanContext({ source: 'HTTP_API_DEV_MOCK' }) }
    })).rejects.toThrow('trusted authentication context');
    await expect(evaluateFinalGate({
      ...input, humanOverride: { ...request, context: humanContext({ timestamp: 'not-a-date' }) }
    })).rejects.toThrow('trusted authentication context');
  });

  it('keeps partial, extra, or stale override coverage BLOCKED', async () => {
    const input = await scenario(completeInput({ court: undefined }));
    const blocked = await evaluateFinalGate(input);
    const eligible = blocked.blockers.filter(item => item.overrideEligible).map(({ id, fingerprint }) => ({ id, fingerprint }));
    const base = { context: humanContext(), reason: '人工承擔風險', scope: { gateInputFingerprint: blocked.gateInputFingerprint } };

    expect((await evaluateFinalGate({ ...input, humanOverride: { ...base, overriddenFindings: eligible.slice(1) } })).status).toBe('BLOCKED');
    expect((await evaluateFinalGate({
      ...input, humanOverride: { ...base, overriddenFindings: [...eligible, { id: 'UNKNOWN', fingerprint: 'x' }] }
    })).status).toBe('BLOCKED');
    expect((await evaluateFinalGate({
      ...input, humanOverride: { ...base, scope: { gateInputFingerprint: 'stale' }, overriddenFindings: eligible }
    })).status).toBe('BLOCKED');
  });

  it('returns BLOCKED_WITH_HUMAN_OVERRIDE only for exact eligible coverage and retains blockers', async () => {
    const caseInput = completeInput({
      parties: [
        ...completeInput().parties,
        { id: 'representative-1', role: 'legal_representative', name: '法代丙' }
      ]
    });
    const input = await scenario(caseInput);
    const blocked = await evaluateFinalGate(input);
    expect(blocked.blockers.length).toBeGreaterThan(0);
    expect(blocked.blockers.every(item => item.overrideEligible)).toBe(true);
    input.humanOverride = {
      context: humanContext(), reason: '審查人明確承擔缺漏風險',
      overriddenFindings: blocked.blockers.map(({ id, fingerprint }) => ({ id, fingerprint })),
      scope: { gateInputFingerprint: blocked.gateInputFingerprint }
    };

    const result = await evaluateFinalGate(input);
    expect(result.status).toBe('BLOCKED_WITH_HUMAN_OVERRIDE');
    expect(result.blockers).toEqual(blocked.blockers);
    expect(result.exportPolicy).toBe('HUMAN_DEPLOY_REQUIRED_FOR_OVERRIDE');
    expect(result.override).toMatchObject({ reviewerId: 'human-approver', reviewerRole: 'APPROVER' });
  });

  it('does not apply Human Override to a READY report', async () => {
    const input = await scenario();
    input.humanOverride = {
      context: humanContext(), reason: '不需要', overriddenFindings: [], scope: { gateInputFingerprint: 'unused' }
    };
    await expect(evaluateFinalGate(input)).rejects.toThrow('no blockers');
  });

  it('produces stable blocker fingerprints for the same gate input', async () => {
    const input = await scenario(completeInput({ court: undefined }));
    const first = await evaluateFinalGate(input);
    const second = await evaluateFinalGate(input);
    expect(second.gateInputFingerprint).toBe(first.gateInputFingerprint);
    expect(second.blockers).toEqual(first.blockers);
  });
});
