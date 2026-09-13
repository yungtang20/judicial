import { describe, expect, it } from 'vitest';
import type {
  CaseInput,
  PleadingReviewReport,
  PleadingRuleProfile,
  ReviewFinding,
  StructuredPleadingDraft
} from '../../types/compliance';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { fingerprintReviewPayload, PLEADING_REVIEWER_VERSION } from '../reviewer/pleadingReviewer';
import { CIVIL_CONTENT_RULE_PROFILE } from '../rules/civilPleadingRuleProfile';
import { applyPleadingRevision, type PleadingRevisionInput } from './pleadingRevision';

function completeInput(): CaseInput {
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
    proceeding: '損害賠償事件', court: '臺灣某地方法院', documentDate: '2026-09-13', signature: '原告甲'
  };
}

function finding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    id: 'P6.FACTS.TRACEABILITY', category: 'FACT_CONSISTENCY', ruleId: 'P6.FACTS.TRACEABILITY',
    status: 'CONFLICT', objectiveBasis: ['P6.FACTS'], source: 'REVIEWER', evidenceLocation: 'draft.sections',
    ...overrides
  };
}

async function report(
  draft: StructuredPleadingDraft,
  caseInput: CaseInput,
  ruleProfile: PleadingRuleProfile,
  findings = [finding()]
): Promise<PleadingReviewReport> {
  return {
    draftId: draft.id,
    draftFingerprint: await fingerprintReviewPayload(draft),
    caseInputId: caseInput.id,
    caseInputFingerprint: await fingerprintReviewPayload(caseInput),
    ruleProfileId: ruleProfile.id,
    ruleProfileVersion: ruleProfile.version,
    ruleProfileFingerprint: await fingerprintReviewPayload(ruleProfile),
    reviewerVersion: PLEADING_REVIEWER_VERSION, objectiveChecks: [], findings
  };
}

async function revisionInput(
  draft: StructuredPleadingDraft,
  findings?: ReviewFinding[],
  caseInput = completeInput(),
  ruleProfile = CIVIL_CONTENT_RULE_PROFILE
): Promise<Omit<PleadingRevisionInput, 'request'>> {
  return { draft, caseInput, ruleProfile, reviewReport: await report(draft, caseInput, ruleProfile, findings) };
}

describe('applyPleadingRevision', () => {
  it('restores only approved content and trace IDs in one requested section', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.sections.find(section => section.id === 'statements')!.content += '\n虛構自認。';
    const before = structuredClone(draft);
    const result = await applyPleadingRevision({
      ...await revisionInput(draft),
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT', targetSectionId: 'statements' }
    });

    expect(result.draft.sections.find(section => section.id === 'statements')?.content).toBe('被告應給付原告。');
    expect(result.draft.sections.filter(section => section.id !== 'statements')).toEqual(before.sections.filter(section => section.id !== 'statements'));
    expect(result.record).toMatchObject({ findingId: 'P6.FACTS.TRACEABILITY', requiresIndependentReview: true });
    expect(result.record.fromDraftId).toBe(before.id);
    expect(result.record.toDraftId).not.toBe(before.id);
    expect(result.record.changedPaths).toEqual(['sections.statements.content', 'id']);
    expect(draft).toEqual(before);
    expect(result).not.toHaveProperty('ready');
    expect(result.record).not.toHaveProperty('resolved');
  });

  it('restores both structure definitions without touching content or source IDs', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    const rendered = draft.sections.find(section => section.id === 'statements')!;
    const definition = draft.structure.sections.find(section => section.id === 'statements')!;
    rendered.title = '錯誤標題';
    definition.ruleIds = ['WRONG'];
    const content = rendered.content;
    const sources = structuredClone(rendered.sourceClaimIds);
    const item = finding({ id: 'P6.STRUCTURE.CONTRACT', category: 'STRUCTURAL' });
    const result = await applyPleadingRevision({
      ...await revisionInput(draft, [item]),
      request: { findingId: item.id, operation: 'RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE', targetSectionId: 'statements' }
    });

    expect(result.draft.sections.find(section => section.id === 'statements')).toMatchObject({ title: '聲明或陳述', content, sourceClaimIds: sources });
    expect(result.draft.structure.sections.find(section => section.id === 'statements')?.ruleIds).toEqual(['CIVIL_116_4']);
    expect(result.record.changedPaths).toEqual([
      'structure.sections.statements.ruleIds', 'sections.statements.title', 'id'
    ]);
  });

  it('rebuilds SOURCE_USAGE without changing sections or omitted proof', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.factsUsed = [];
    draft.factsUnused = ['fact-1'];
    draft.omittedSectionIds = ['court'];
    const sections = structuredClone(draft.sections);
    const result = await applyPleadingRevision({
      ...await revisionInput(draft),
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    });

    expect(result.draft.factsUsed).toEqual(['fact-1']);
    expect(result.draft.factsUnused).toEqual([]);
    expect(result.draft.sections).toEqual(sections);
    expect(result.draft.omittedSectionIds).toEqual(['court']);
    expect(result.record.changedPaths).toEqual(['factsUsed', 'factsUnused', 'id']);
  });

  it('rebuilds OMITTED_SECTIONS without changing source usage', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.omittedSectionIds = ['court'];
    draft.factsUsed = [];
    const item = finding({ id: 'P6.STRUCTURE.CONTRACT', category: 'STRUCTURAL' });
    const result = await applyPleadingRevision({
      ...await revisionInput(draft, [item]),
      request: { findingId: item.id, operation: 'REBUILD_NEGATIVE_PROOF', scope: 'OMITTED_SECTIONS' }
    });

    expect(result.draft.omittedSectionIds).toEqual([]);
    expect(result.draft.factsUsed).toEqual([]);
    expect(result.record.changedPaths).toEqual(['omittedSectionIds', 'id']);
  });

  it.each([
    ['draft', (draft: StructuredPleadingDraft, input: CaseInput, profile: PleadingRuleProfile) => { draft.sections[0].content += '漂移'; }],
    ['CaseInput', (_draft: StructuredPleadingDraft, input: CaseInput) => { input.court = '另一法院'; }],
    ['Rule Profile', (_draft: StructuredPleadingDraft, _input: CaseInput, profile: PleadingRuleProfile) => { profile.rules[0].description = '漂移'; }]
  ] as const)('rejects same-ID %s payload drift after review', async (_label, mutate) => {
    const input = completeInput();
    const profile = structuredClone(CIVIL_CONTENT_RULE_PROFILE);
    const draft = buildStructuredPleadingDraft(input, profile);
    const base = await revisionInput(draft, undefined, input, profile);
    mutate(draft, input, profile);

    await expect(applyPleadingRevision({
      ...base, draft, caseInput: input, ruleProfile: profile,
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    })).rejects.toThrow('reviewed payload snapshots');
  });

  it('rejects unknown and duplicate Finding IDs', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    const duplicate = finding();
    const request = { findingId: duplicate.id, operation: 'REBUILD_NEGATIVE_PROOF' as const, scope: 'SOURCE_USAGE' as const };
    await expect(applyPleadingRevision({ ...await revisionInput(draft, []), request })).rejects.toThrow('one unique Finding ID');
    await expect(applyPleadingRevision({ ...await revisionInput(draft, [duplicate, duplicate]), request })).rejects.toThrow('one unique Finding ID');
  });

  it.each(['COMPLIANT', 'WARNING', 'UNVERIFIED', 'NOT_APPLICABLE'] as const)(
    'rejects a %s finding', async status => {
      const draft = buildStructuredPleadingDraft(completeInput());
      const item = finding({ status });
      await expect(applyPleadingRevision({
        ...await revisionInput(draft, [item]),
        request: { findingId: item.id, operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
      })).rejects.toThrow('not a confirmed revisable problem');
    }
  );

  it.each(['CITATION', 'EVIDENCE_MAPPING', 'FORMAT'] as const)(
    'rejects automatic revision for %s', async category => {
      const draft = buildStructuredPleadingDraft(completeInput());
      draft.factsUsed = [];
      const item = finding({ id: `P6.${category}`, category });
      await expect(applyPleadingRevision({
        ...await revisionInput(draft, [item]),
        request: { findingId: item.id, operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
      })).rejects.toThrow('not allowed');
    }
  );

  it('enforces finding source and category-operation pairings', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.factsUsed = [];
    const wrongSource = finding({ source: 'COMPLIANCE_ENGINE' });
    await expect(applyPleadingRevision({
      ...await revisionInput(draft, [wrongSource]),
      request: { findingId: wrongSource.id, operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    })).rejects.toThrow('not allowed');

    const structural = finding({ id: 'P6.STRUCTURE.CONTRACT', category: 'STRUCTURAL' });
    await expect(applyPleadingRevision({
      ...await revisionInput(draft, [structural]),
      request: { findingId: structural.id, operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    })).rejects.toThrow('scope SOURCE_USAGE is not allowed');
  });

  it('requires a legal-content finding to uniquely govern the target section', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.sections.find(section => section.id === 'signature')!.content = '';
    const item = finding({
      id: 'P6.LEGAL_CONTENT.CIVIL_116_7.1', category: 'LEGAL_CONTENT', ruleId: 'CIVIL_116_7',
      status: 'MISSING', source: 'COMPLIANCE_ENGINE'
    });
    await expect(applyPleadingRevision({
      ...await revisionInput(draft, [item]),
      request: { findingId: item.id, operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT', targetSectionId: 'signature' }
    })).rejects.toThrow('does not uniquely govern');
  });

  it('rejects missing or duplicate target sections', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.sections = draft.sections.filter(section => section.id !== 'statements');
    const base = await revisionInput(draft);
    await expect(applyPleadingRevision({
      ...base,
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT', targetSectionId: 'statements' }
    })).rejects.toThrow('must exist uniquely');

    const duplicateDraft = buildStructuredPleadingDraft(completeInput());
    duplicateDraft.sections.push(structuredClone(duplicateDraft.sections.find(section => section.id === 'statements')!));
    await expect(applyPleadingRevision({
      ...await revisionInput(duplicateDraft),
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT', targetSectionId: 'statements' }
    })).rejects.toThrow('duplicate section');
  });

  it('rejects unverified, inapplicable, or duplicate-rule profiles', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    draft.factsUsed = [];
    const request = { findingId: 'P6.FACTS.TRACEABILITY', operation: 'REBUILD_NEGATIVE_PROOF' as const, scope: 'SOURCE_USAGE' as const };
    for (const profile of [
      { ...CIVIL_CONTENT_RULE_PROFILE, verificationStatus: 'UNVERIFIED' as const },
      { ...CIVIL_CONTENT_RULE_PROFILE, caseType: 'family' as const },
      { ...CIVIL_CONTENT_RULE_PROFILE, rules: [...CIVIL_CONTENT_RULE_PROFILE.rules, CIVIL_CONTENT_RULE_PROFILE.rules[0]] }
    ]) {
      await expect(applyPleadingRevision({
        ...await revisionInput(draft, undefined, completeInput(), profile), request
      })).rejects.toThrow('applicable, verified Rule Profile');
    }
  });

  it('rejects a canonical source with blocking traceability findings', async () => {
    const input = completeInput();
    input.facts[0].id = '';
    const draft = buildStructuredPleadingDraft(input);
    draft.factsUsed = [];
    await expect(applyPleadingRevision({
      ...await revisionInput(draft, undefined, input),
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    })).rejects.toThrow('Canonical revision source contains blocking');
  });

  it('rejects no-op revision instead of creating a misleading record', async () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    await expect(applyPleadingRevision({
      ...await revisionInput(draft),
      request: { findingId: 'P6.FACTS.TRACEABILITY', operation: 'REBUILD_NEGATIVE_PROOF', scope: 'SOURCE_USAGE' }
    })).rejects.toThrow('no scoped change');
  });
});
