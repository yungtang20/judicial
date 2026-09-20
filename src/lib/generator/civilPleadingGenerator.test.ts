import { describe, expect, it } from 'vitest';
import type { CaseInput, PleadingRuleProfile, RequirementLevel } from '../../types/compliance';
import { CIVIL_CONTENT_RULE_PROFILE } from '../rules/civilPleadingRuleProfile';
import { buildStructuredPleadingDraft } from './civilPleadingGenerator';

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
    facts: [
      {
        id: 'fact-1',
        content: '被告未履行契約。',
        sourceLevel: 'EVIDENCE_BACKED',
        evidenceIds: ['evidence-1']
      }
    ],
    claims: [
      {
        id: 'claim-1',
        statement: '被告應給付原告。',
        factIds: ['fact-1'],
        evidenceIds: ['evidence-1']
      }
    ],
    evidence: [{ id: 'evidence-1', content: '契約書' }],
    attachments: [{ id: 'attachment-1', content: '契約書影本' }],
    proceeding: '損害賠償事件',
    court: '臺灣某地方法院',
    documentDate: '2026-09-12',
    signature: '原告甲',
    ...overrides
  };
}

function withRules(rules: PleadingRuleProfile['rules']): PleadingRuleProfile {
  return { ...CIVIL_CONTENT_RULE_PROFILE, rules };
}

describe('buildStructuredPleadingDraft', () => {
  it.each(CIVIL_CONTENT_RULE_PROFILE.supportedPleadingTypes || [])(
    'accepts profile-supported pleading type %s',
    pleadingType => {
      const draft = buildStructuredPleadingDraft(completeInput({ pleadingType }));
      const complaintRuleApplied = draft.structure.sections.some(section =>
        section.ruleIds.includes('CIVIL_244_2')
      );

      expect(draft.missingInputs?.some(item => item.field === 'ruleProfile')).toBe(false);
      expect(complaintRuleApplied).toBe(pleadingType === 'complaint');
    }
  );

  it('builds a traceable structured draft controlled by the canonical profile', () => {
    const draft = buildStructuredPleadingDraft(completeInput());
    const facts = draft.sections.find(section => section.id === 'subject_and_facts');

    expect(draft.missingInputs).toEqual([]);
    expect(draft.ruleProfileVersion).toBe(CIVIL_CONTENT_RULE_PROFILE.version);
    expect(draft.structure.pleadingType).toBe('complaint');
    expect(facts).toMatchObject({
      content: '被告未履行契約。',
      sourceFactIds: ['fact-1'],
      ruleIds: ['CIVIL_244_2'],
      requirementLevels: ['REQUIRED']
    });
    expect(draft.sections.find(section => section.id === 'judgment_relief')).toMatchObject({
      sourceClaimIds: ['claim-1'],
      sourceFactIds: ['fact-1'],
      sourceEvidenceIds: ['evidence-1']
    });
    expect(draft.claimsUsed).toEqual(['claim-1']);
    expect(draft.claimsUnused).toEqual([]);
    expect(draft.factsUsed).toEqual(['fact-1']);
    expect(draft.factsUnused).toEqual([]);
    expect(draft.evidenceUsed).toEqual(['evidence-1', 'attachment-1']);
    expect(draft.evidenceUnused).toEqual([]);
    expect(draft.sections.find(section => section.id === 'attachments')?.content).toContain('件數：1');
  });

  it('reports missing REQUIRED content as legal completeness without inventing placeholders', () => {
    const draft = buildStructuredPleadingDraft(
      completeInput({ court: undefined, documentDate: undefined, signature: undefined })
    );

    expect(draft.missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'court', category: 'LEGAL_COMPLETENESS', severity: 'HIGH' }),
        expect.objectContaining({ field: 'date', category: 'LEGAL_COMPLETENESS', severity: 'HIGH' }),
        expect.objectContaining({ field: 'signature', category: 'LEGAL_COMPLETENESS', severity: 'HIGH' })
      ])
    );
    expect(draft.sections.find(section => section.id === 'court')?.content).toBe('');
    expect(JSON.stringify(draft.sections)).not.toMatch(/詳如附件|待補|依實際情況|相關資料如下/);
  });

  it('does not turn missing RECOMMENDED content into a finding', () => {
    const draft = buildStructuredPleadingDraft(completeInput());

    expect(draft.sections.find(section => section.id === 'party_identifiers')?.content).toBe('');
    expect(draft.missingInputs?.some(item => item.sourceRequirement === 'CIVIL_116_RECOMMENDED_IDENTIFIERS')).toBe(false);
  });

  it('applies complaint-only rules from pleadingTypes rather than rule IDs', () => {
    const answer = buildStructuredPleadingDraft(
      completeInput({
        pleadingType: 'answer',
        styleProfile: 'litigation_brief',
        facts: [
          ...completeInput().facts,
          { id: 'unused-fact', content: '不應使用的額外事實。', sourceLevel: 'USER_PROVIDED_FACT' }
        ]
      })
    );

    expect(answer.sections.some(section => section.id === 'subject_and_facts')).toBe(false);
    expect(answer.structure.sections.some(section => section.ruleIds.includes('CIVIL_244_2'))).toBe(false);
    expect(answer.factsUsed).toEqual(['fact-1']);
    expect(answer.factsUnused).toEqual(['unused-fact']);
    expect(JSON.stringify(answer.sections)).not.toContain('不應使用的額外事實。');
  });

  it('does not insert facts or evidence that no claim references', () => {
    const draft = buildStructuredPleadingDraft(
      completeInput({
        facts: [
          ...completeInput().facts,
          { id: 'unused-fact', content: '不得帶入的事實。', sourceLevel: 'USER_PROVIDED_FACT' }
        ],
        evidence: [
          ...completeInput().evidence,
          { id: 'unused-evidence', content: '不得帶入的證據。' }
        ]
      })
    );
    const output = JSON.stringify(draft.sections);

    expect(output).not.toContain('不得帶入的事實。');
    expect(output).not.toContain('不得帶入的證據。');
    expect(draft.factsUnused).toEqual(['unused-fact']);
    expect(draft.evidenceUnused).toEqual(['unused-evidence']);
  });

  it('uses representative rules conditionally and checks supplied representatives field by field', () => {
    const withoutRepresentative = buildStructuredPleadingDraft(completeInput());
    const incompleteRepresentative = buildStructuredPleadingDraft(
      completeInput({
        parties: [
          ...completeInput().parties,
          {
            id: 'representative-1',
            role: 'legal_representative',
            name: '法代丙',
            representedPartyId: 'party-1'
          }
        ]
      })
    );

    expect(withoutRepresentative.missingInputs?.some(item => item.sourceRequirement === 'CIVIL_116_2')).toBe(false);
    expect(incompleteRepresentative.missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'representatives[0].address' }),
        expect.objectContaining({ field: 'representatives[0].relationshipToParty' })
      ])
    );
  });

  it('protects a family-style protected address at the data layer', () => {
    const draft = buildStructuredPleadingDraft(
      completeInput({
        parties: [
          {
            id: 'party-1',
            role: 'claimant',
            name: '聲請人甲',
            address: '不得公開的實際地址',
            addressProtection: {
              requested: true,
              serviceAddress: '送達代收處所',
              actualAddressStorage: 'protected',
              publicDocumentAddress: null
            }
          }
        ]
      })
    );
    const output = JSON.stringify(draft.sections);

    expect(output).toContain('送達代收處所');
    expect(output).not.toContain('不得公開的實際地址');
  });

  it('fails the generation threshold for malformed runtime input and traceability violations', () => {
    const malformed = completeInput({ facts: undefined as unknown as CaseInput['facts'] });
    const untraceable = completeInput({
      facts: [
        {
          id: 'fact-1',
          content: '被告未履行契約。',
          sourceLevel: 'EVIDENCE_BACKED',
          evidenceIds: ['missing-evidence']
        }
      ]
    });

    expect(buildStructuredPleadingDraft(malformed).missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'facts', category: 'MINIMUM_GENERATION', severity: 'BLOCKING' })
      ])
    );
    expect(buildStructuredPleadingDraft(untraceable).missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'facts[0].evidenceIds[0]', category: 'TRACEABILITY', severity: 'BLOCKING' })
      ])
    );

    const brokenClaim = completeInput({
      claims: [{ id: 'claim-1', statement: '請求內容。', factIds: ['missing-fact'] }]
    });
    expect(buildStructuredPleadingDraft(brokenClaim).missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'claims[0].factIds[0]', category: 'TRACEABILITY' })
      ])
    );

    const duplicateSources = completeInput({
      evidence: [
        { id: 'duplicate', content: '證據一' },
        { id: 'duplicate', content: '證據二' }
      ],
      attachments: [{ id: 'duplicate', content: '附件' }]
    });
    expect(buildStructuredPleadingDraft(duplicateSources).missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'evidence[1].id', category: 'TRACEABILITY' }),
        expect.objectContaining({ field: 'attachments[0].id', category: 'TRACEABILITY' })
      ])
    );
  });

  it('fails closed for profile mismatch, unknown levels, and unapproved rules', () => {
    const versionMismatch = completeInput({ expectedRuleProfileVersion: 'old-version' });
    const unknownLevel = withRules([
      ...CIVIL_CONTENT_RULE_PROFILE.rules,
      {
        id: 'CUSTOM_UNKNOWN_LEVEL',
        basis: 'approved-source',
        description: '測試規則',
        level: 'UNKNOWN' as RequirementLevel,
        appliesTo: ['civil'],
        targetSection: 'court'
      }
    ]);
    const unapproved = { ...CIVIL_CONTENT_RULE_PROFILE, verificationStatus: 'NOT_APPROVED' as const };

    expect(buildStructuredPleadingDraft(versionMismatch).missingInputs).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'expectedRuleProfileVersion', category: 'PROFILE' })])
    );
    expect(buildStructuredPleadingDraft(completeInput(), unknownLevel).missingInputs).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceRequirement: 'CUSTOM_UNKNOWN_LEVEL', category: 'PROFILE' })])
    );
    expect(buildStructuredPleadingDraft(completeInput(), unapproved).missingInputs).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'ruleProfile', severity: 'BLOCKING' })])
    );
  });

  it('fails closed for duplicate rule IDs and unknown target sections without duplicating sections', () => {
    const duplicate = CIVIL_CONTENT_RULE_PROFILE.rules[0];
    const profile = withRules([
      ...CIVIL_CONTENT_RULE_PROFILE.rules,
      duplicate,
      {
        id: 'CUSTOM_REQUIRED',
        basis: 'approved-source',
        description: '無輸入 mapping 的測試規則',
        level: 'REQUIRED',
        appliesTo: ['civil'],
        targetSection: 'unknown_section'
      }
    ]);
    const draft = buildStructuredPleadingDraft(completeInput(), profile);

    expect(draft.missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: expect.stringMatching(/^rules\[\d+\]\.id$/), category: 'PROFILE' }),
        expect.objectContaining({ field: 'unknown_section', sourceRequirement: 'CUSTOM_REQUIRED' })
      ])
    );
    expect(new Set(draft.sections.map(section => section.id)).size).toBe(draft.sections.length);
    expect(draft.omittedSectionIds).toContain('unknown_section');
  });

  it('does not inject legal descriptions, unsupported facts, or compliance conclusions', () => {
    const wrongDescription = withRules(
      CIVIL_CONTENT_RULE_PROFILE.rules.map(rule =>
        rule.id === 'CIVIL_116_7' ? { ...rule, description: '錯誤案件資料與錯誤法條內容' } : rule
      )
    );
    const answer = buildStructuredPleadingDraft(
      completeInput({
        pleadingType: 'answer',
        styleProfile: 'litigation_brief',
        legalReferencesUsed: ['未實際插入草稿的引用']
      }),
      wrongDescription
    );
    const output = JSON.stringify(answer);

    expect(output).not.toContain('錯誤案件資料與錯誤法條內容');
    expect(output).not.toContain('被告未履行契約。');
    expect(answer.legalReferencesUsed).toEqual([]);
    expect(answer).not.toHaveProperty('compliant');
    expect(answer).not.toHaveProperty('passed');
    expect(answer).not.toHaveProperty('ready');
  });

  it('keeps an unverified fact explicit without claiming it is evidence-backed', () => {
    const draft = buildStructuredPleadingDraft(
      completeInput({
        facts: [
          {
            id: 'fact-1',
            content: '使用者陳述但尚無證據的事實。',
            sourceLevel: 'USER_PROVIDED_FACT'
          }
        ]
      })
    );

    expect(draft.sections.find(section => section.id === 'subject_and_facts')?.content).toBe('使用者陳述但尚無證據的事實。');
    expect(JSON.stringify(draft.sections)).not.toMatch(/已證明|證據證明|查證屬實/);
  });

  it('marks an empty REQUIRED section as incomplete while preserving zero attachment count', () => {
    const draft = buildStructuredPleadingDraft(
      completeInput({ proceeding: ' ', attachments: [] })
    );

    expect(draft.missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'proceeding', sourceRequirement: 'CIVIL_116_3' })
      ])
    );
    expect(draft.sections.find(section => section.id === 'attachments')?.content).toBe('件數：0');
  });
});
