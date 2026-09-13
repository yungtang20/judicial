import { describe, expect, it } from 'vitest';
import type { CaseInput, LegalReference } from '../../types/compliance';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { CIVIL_CONTENT_RULE_PROFILE } from '../rules/civilPleadingRuleProfile';
import { verifyPleadingCompliance } from './pleadingComplianceEngine';

const legalReferences: LegalReference[] = [
  {
    sourceReference: 'legal_references/civil_procedure_116.md',
    verificationStatus: 'VERIFIED',
    contentHash: '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46'
  },
  {
    sourceReference: 'legal_references/civil_procedure_117.md',
    verificationStatus: 'VERIFIED',
    contentHash: '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d'
  },
  {
    sourceReference: 'legal_references/civil_procedure_244.md',
    verificationStatus: 'VERIFIED',
    contentHash: 'ff32248360cbe6db8297292014abb0e377dcc520e5822b42c24649dc71ca03b6'
  }
];

function completeInput(overrides: Partial<CaseInput> = {}): CaseInput {
  return {
    id: 'case-1',
    caseType: 'civil',
    pleadingType: 'complaint',
    styleProfile: 'civil_complaint',
    parties: [
      { id: 'party-1', role: 'claimant', name: '原告甲', address: '原告地址' },
      { id: 'party-2', role: 'respondent', name: '被告乙', address: '被告地址' }
    ],
    facts: [{
      id: 'fact-1',
      content: '被告未履行契約。',
      sourceLevel: 'EVIDENCE_BACKED',
      evidenceIds: ['evidence-1']
    }],
    claims: [{
      id: 'claim-1',
      statement: '被告應給付原告。',
      factIds: ['fact-1'],
      evidenceIds: ['evidence-1']
    }],
    evidence: [{ id: 'evidence-1', content: '契約書' }],
    attachments: [{ id: 'attachment-1', content: '契約書影本' }],
    proceeding: '損害賠償事件',
    court: '臺灣某地方法院',
    documentDate: '2026-09-12',
    signature: '原告甲',
    ...overrides
  };
}

function verify(input = completeInput()) {
  return verifyPleadingCompliance({
    draft: buildStructuredPleadingDraft(input),
    caseInput: input,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences
  });
}

describe('verifyPleadingCompliance', () => {
  it('verifies structured values and trace IDs without treating empty recommendations as required', () => {
    const findings = verify();

    expect(findings.find(item => item.ruleId === 'CIVIL_116_1')?.status).toBe('COMPLIANT');
    expect(findings.find(item => item.ruleId === 'CIVIL_116_2')?.status).toBe('NOT_APPLICABLE');
    expect(findings.find(item => item.ruleId === 'CIVIL_116_RECOMMENDED_IDENTIFIERS')?.status).toBe('WARNING');
    expect(findings.find(item => item.ruleId === 'CIVIL_244_RECOMMENDED')?.status).toBe('WARNING');
    expect(findings.some(item => item.status === 'MISSING' || item.status === 'CONFLICT')).toBe(false);
  });

  it('does not accept a heading or unrelated text as compliance', () => {
    const input = completeInput();
    const draft = buildStructuredPleadingDraft(input);
    const court = draft.sections.find(section => section.id === 'court')!;
    court.content = '法院';

    const findings = verifyPleadingCompliance({
      draft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    });

    expect(findings.find(item => item.ruleId === 'CIVIL_116_7')?.status).toBe('CONFLICT');
  });

  it('reports a missing required section independently from generator missingInputs', () => {
    const input = completeInput();
    const draft = buildStructuredPleadingDraft(input);
    draft.missingInputs = [];
    draft.sections = draft.sections.filter(section => section.id !== 'evidence');

    const findings = verifyPleadingCompliance({
      draft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    });

    expect(findings.find(item => item.ruleId === 'CIVIL_116_5')?.status).toBe('MISSING');
  });

  it('marks complaint-only rules not applicable to an answer', () => {
    const findings = verify(completeInput({ pleadingType: 'answer', styleProfile: 'litigation_brief' }));

    expect(findings.filter(item => item.ruleId.startsWith('CIVIL_244_')).every(item => item.status === 'NOT_APPLICABLE')).toBe(true);
  });

  it('fails closed for source, profile version, structure, and trace conflicts', () => {
    const input = completeInput();
    const sourceDraft = buildStructuredPleadingDraft(input);
    const sourceFindings = verifyPleadingCompliance({
      draft: sourceDraft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences: legalReferences.slice(1)
    });
    expect(sourceFindings.find(item => item.ruleId === 'CIVIL_116_1')?.status).toBe('UNVERIFIED');

    const versionDraft = buildStructuredPleadingDraft(input);
    versionDraft.ruleProfileVersion = 'wrong-version';
    expect(verifyPleadingCompliance({
      draft: versionDraft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    }).find(item => item.ruleId === 'CIVIL_116_1')?.status).toBe('CONFLICT');

    const traceDraft = buildStructuredPleadingDraft(input);
    traceDraft.sections.find(section => section.id === 'evidence')!.sourceEvidenceIds = ['unknown'];
    expect(verifyPleadingCompliance({
      draft: traceDraft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    }).find(item => item.ruleId === 'CIVIL_116_5')?.status).toBe('CONFLICT');
  });

  it('rejects duplicate sections and duplicate rule IDs', () => {
    const input = completeInput();
    const duplicateSectionDraft = buildStructuredPleadingDraft(input);
    duplicateSectionDraft.sections.push(structuredClone(duplicateSectionDraft.sections[0]));
    expect(verifyPleadingCompliance({
      draft: duplicateSectionDraft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    }).find(item => item.ruleId === 'CIVIL_116_1')?.status).toBe('CONFLICT');

    const duplicateRuleProfile = {
      ...CIVIL_CONTENT_RULE_PROFILE,
      rules: [...CIVIL_CONTENT_RULE_PROFILE.rules, CIVIL_CONTENT_RULE_PROFILE.rules[0]]
    };
    expect(verifyPleadingCompliance({
      draft: buildStructuredPleadingDraft(input),
      caseInput: input,
      ruleProfile: duplicateRuleProfile,
      legalReferences
    }).filter(item => item.ruleId === 'CIVIL_116_1').every(item => item.status === 'CONFLICT')).toBe(true);
  });

  it('detects protected-address disclosure anywhere in the draft', () => {
    const input = completeInput({
      parties: [{
        id: 'party-1',
        role: 'claimant',
        name: '原告甲',
        address: '秘密實際地址',
        addressProtection: {
          requested: true,
          serviceAddress: '公開送達處所',
          actualAddressStorage: 'protected',
          publicDocumentAddress: null
        }
      }]
    });
    const draft = buildStructuredPleadingDraft(input);
    draft.sections.find(section => section.id === 'statements')!.content += '\n秘密實際地址';

    const findings = verifyPleadingCompliance({
      draft,
      caseInput: input,
      ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
      legalReferences
    });
    expect(findings.find(item => item.ruleId === 'CIVIL_116_1')?.status).toBe('CONFLICT');
  });
});
