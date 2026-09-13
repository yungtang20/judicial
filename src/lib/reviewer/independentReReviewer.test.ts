import { describe, expect, it } from 'vitest';
import type { CaseInput, LegalReference } from '../../types/compliance';
import { verifyPleadingCompliance } from '../compliance/pleadingComplianceEngine';
import { verifyGenerationTemplate } from '../compliance/generationTemplateVerifier';
import { verifyGeneratedDocument } from '../generatedDocumentPipeline';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { applyPleadingRevision } from '../revision/pleadingRevision';
import { CIVIL_CONTENT_RULE_PROFILE, FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';
import { independentlyReReview, type IndependentReReviewInput } from './independentReReviewer';
import { reviewStructuredPleading } from './pleadingReviewer';

const legalReferences: LegalReference[] = [
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

async function review(draft: ReturnType<typeof buildStructuredPleadingDraft>, caseInput: CaseInput) {
  const documentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  return reviewStructuredPleading({
    draft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    complianceFindings: verifyPleadingCompliance({
      draft, caseInput, ruleProfile: CIVIL_CONTENT_RULE_PROFILE, legalReferences
    }),
    citationVerification: verifyGeneratedDocument(documentText),
    formatFinding: verifyGenerationTemplate('civil', FORMAT_PROFILES.civil),
    appliedFormatProfile: FORMAT_PROFILES.civil
  });
}

async function factScenario(caseInput = completeInput()): Promise<IndependentReReviewInput> {
  const originalDraft = buildStructuredPleadingDraft(caseInput);
  originalDraft.sections.find(section => section.id === 'statements')!.content += '\n虛構自認。';
  const originalReviewReport = await review(originalDraft, caseInput);
  const revision = await applyPleadingRevision({
    draft: originalDraft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    reviewReport: originalReviewReport,
    request: {
      findingId: 'P6.FACTS.TRACEABILITY',
      operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT',
      targetSectionId: 'statements'
    }
  });
  return {
    originalDraft,
    revisedDraft: revision.draft,
    caseInput,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences,
    originalReviewReport,
    revisionRecord: revision.record
  };
}

describe('independentlyReReview', () => {
  it('independently reruns verification and confirms all four P8 requirements', async () => {
    const result = await independentlyReReview(await factScenario());

    expect(result.allChecksPassed).toBe(true);
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every(check => check.status === 'COMPLIANT')).toBe(true);
    expect(result.revisedReviewReport.draftId).toBe(result.revisedDraftId);
    expect(result).not.toHaveProperty('ready');
    expect(result).not.toHaveProperty('finalGate');
  });

  it('does not mutate the original, revised, case, profile, report, or record payload', async () => {
    const input = await factScenario();
    const before = structuredClone(input);
    await independentlyReReview(input);
    expect(input).toEqual(before);
  });

  it.each([
    ['fromDraftId', 'other'],
    ['toDraftId', 'other'],
    ['sourceCaseInputId', 'other'],
    ['sourceRuleProfileId', 'other'],
    ['sourceRuleProfileVersion', 'other']
  ] as const)('rejects mismatched Revision Record binding %s', async (field, value) => {
    const input = await factScenario();
    input.revisionRecord[field] = value;
    await expect(independentlyReReview(input)).rejects.toThrow('bindings do not match');
  });

  it.each(['draftId', 'caseInputId', 'ruleProfileId', 'ruleProfileVersion'] as const)(
    'rejects mismatched original report binding %s', async field => {
      const input = await factScenario();
      input.originalReviewReport[field] = 'other';
      await expect(independentlyReReview(input)).rejects.toThrow('bindings do not match');
    }
  );

  it('rejects a reviewer-version mismatch', async () => {
    const input = await factScenario();
    input.originalReviewReport.reviewerVersion = 'older';
    await expect(independentlyReReview(input)).rejects.toThrow('bindings do not match');
  });

  it.each(['originalDraft', 'caseInput', 'ruleProfile'] as const)(
    'rejects same-ID payload drift in %s', async target => {
      const input = await factScenario();
      if (target === 'originalDraft') input.originalDraft.sections[0].content += '漂移';
      if (target === 'caseInput') input.caseInput.court = '另一法院';
      if (target === 'ruleProfile') input.ruleProfile.rules[0].description = '漂移';
      await expect(independentlyReReview(input)).rejects.toThrow('bindings do not match');
    }
  );

  it('rejects a tampered original finding even when payload fingerprints remain unchanged', async () => {
    const input = await factScenario();
    input.originalReviewReport.findings.find(item => item.id === input.revisionRecord.findingId)!.status = 'COMPLIANT';
    await expect(independentlyReReview(input)).rejects.toThrow('does not match independently recomputed');
  });

  it('rejects revised changes outside recorded Finding paths', async () => {
    const input = await factScenario();
    input.revisedDraft.sections.find(section => section.id === 'court')!.content = '另一法院';
    await expect(independentlyReReview(input)).rejects.toThrow('outside the recorded Finding scope');
  });

  it('rejects duplicate, unscoped, and no-op changed paths', async () => {
    const duplicate = await factScenario();
    duplicate.revisionRecord.changedPaths.push('id');
    await expect(independentlyReReview(duplicate)).rejects.toThrow('unscoped changed paths');

    const unscoped = await factScenario();
    unscoped.revisionRecord.changedPaths.push('sections.statements.title');
    await expect(independentlyReReview(unscoped)).rejects.toThrow('unscoped changed paths');

    const noOp = await factScenario();
    noOp.revisionRecord.changedPaths.push('sections.statements.sourceFactIds');
    await expect(independentlyReReview(noOp)).rejects.toThrow('no-op');
  });

  it('rejects an invalid operation target or missing mandatory draft-ID path', async () => {
    const target = await factScenario();
    delete target.revisionRecord.targetSectionId;
    await expect(independentlyReReview(target)).rejects.toThrow('valid scoped target');

    const missingId = await factScenario();
    missingId.revisionRecord.changedPaths = missingId.revisionRecord.changedPaths.filter(path => path !== 'id');
    await expect(independentlyReReview(missingId)).rejects.toThrow('unscoped changed paths');
  });

  it('allows P8 scope checks to pass while preserving an unrelated pre-existing blocker for P9', async () => {
    const input = completeInput({ court: '民法第184條' });
    const result = await independentlyReReview(await factScenario(input));

    expect(result.allChecksPassed).toBe(true);
    expect(result.revisedReviewReport.findings).toContainEqual(expect.objectContaining({
      category: 'CITATION', status: 'UNVERIFIED'
    }));
  });

  it('detects a new citation problem introduced by restoring CaseInput content', async () => {
    const caseInput = completeInput({ court: '民法第9999條' });
    const originalDraft = buildStructuredPleadingDraft(caseInput);
    originalDraft.sections.find(section => section.id === 'court')!.content = '';
    const originalReviewReport = await review(originalDraft, caseInput);
    const target = originalReviewReport.findings.find(item => item.ruleId === 'CIVIL_116_7')!;
    const revision = await applyPleadingRevision({
      draft: originalDraft,
      caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      reviewReport: originalReviewReport,
      request: {
        findingId: target.id,
        operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT',
        targetSectionId: 'court'
      }
    });
    const result = await independentlyReReview({
      originalDraft,
      revisedDraft: revision.draft,
      caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences,
      originalReviewReport,
      revisionRecord: revision.record
    });

    expect(result.allChecksPassed).toBe(false);
    expect(result.checks.find(check => check.id === 'P8.NO_NEW_FINDINGS')?.status).toBe('CONFLICT');
  });

  it('independently verifies a section-structure-only revision', async () => {
    const caseInput = completeInput();
    const originalDraft = buildStructuredPleadingDraft(caseInput);
    originalDraft.sections.find(section => section.id === 'statements')!.ruleIds = ['WRONG'];
    originalDraft.structure.sections.find(section => section.id === 'statements')!.ruleIds = ['WRONG'];
    const originalReviewReport = await review(originalDraft, caseInput);
    const revision = await applyPleadingRevision({
      draft: originalDraft,
      caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      reviewReport: originalReviewReport,
      request: {
        findingId: 'P6.STRUCTURE.CONTRACT',
        operation: 'RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE',
        targetSectionId: 'statements'
      }
    });

    const result = await independentlyReReview({
      originalDraft, revisedDraft: revision.draft, caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE, legalReferences,
      originalReviewReport, revisionRecord: revision.record
    });
    expect(result.allChecksPassed).toBe(true);
  });

  it('independently verifies a source-usage negative-proof revision', async () => {
    const caseInput = completeInput();
    const originalDraft = buildStructuredPleadingDraft(caseInput);
    originalDraft.factsUsed = [];
    originalDraft.factsUnused = ['fact-1'];
    const originalReviewReport = await review(originalDraft, caseInput);
    const revision = await applyPleadingRevision({
      draft: originalDraft,
      caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      reviewReport: originalReviewReport,
      request: {
        findingId: 'P6.FACTS.TRACEABILITY',
        operation: 'REBUILD_NEGATIVE_PROOF',
        scope: 'SOURCE_USAGE'
      }
    });

    const result = await independentlyReReview({
      originalDraft, revisedDraft: revision.draft, caseInput,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE, legalReferences,
      originalReviewReport, revisionRecord: revision.record
    });
    expect(result.allChecksPassed).toBe(true);
  });

  it('rejects a record that points to an original non-problem Finding', async () => {
    const input = await factScenario();
    input.revisionRecord.findingId = 'P6.STRUCTURE.CONTRACT';
    await expect(independentlyReReview(input)).rejects.toThrow('confirmed MISSING or CONFLICT');
  });

  it('rejects a duplicate-rule profile drift before accepting its report', async () => {
    const input = await factScenario();
    input.ruleProfile = structuredClone(input.ruleProfile);
    input.ruleProfile.rules.push(structuredClone(input.ruleProfile.rules[0]));
    await expect(independentlyReReview(input)).rejects.toThrow();
  });
});
