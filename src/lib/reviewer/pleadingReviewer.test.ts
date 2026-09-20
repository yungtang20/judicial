import { describe, expect, it } from 'vitest';
import type { CaseInput, LegalReference, ReviewCategory } from '../../types/compliance';
import { verifyGeneratedDocument } from '../generatedDocumentPipeline';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { verifyPleadingCompliance } from '../compliance/pleadingComplianceEngine';
import { verifyGenerationTemplate } from '../compliance/generationTemplateVerifier';
import { CIVIL_CONTENT_RULE_PROFILE, FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';
import { fingerprintReviewPayload, reviewStructuredPleading } from './pleadingReviewer';

const legalReferences: LegalReference[] = [
  { sourceReference: 'legal_references/civil_procedure_116.md', verificationStatus: 'VERIFIED', contentHash: '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46' },
  { sourceReference: 'legal_references/civil_procedure_117.md', verificationStatus: 'VERIFIED', contentHash: '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d' },
  { sourceReference: 'legal_references/civil_procedure_244.md', verificationStatus: 'VERIFIED', contentHash: 'ff32248360cbe6db8297292014abb0e377dcc520e5822b42c24649dc71ca03b6' }
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
    facts: [{ id: 'fact-1', content: '被告未履行契約。', sourceLevel: 'EVIDENCE_BACKED', evidenceIds: ['evidence-1'] }],
    claims: [{ id: 'claim-1', statement: '被告應給付原告。', factIds: ['fact-1'], evidenceIds: ['evidence-1'] }],
    evidence: [{ id: 'evidence-1', content: '契約書' }],
    attachments: [{ id: 'attachment-1', content: '契約書影本' }],
    proceeding: '損害賠償事件',
    court: '臺灣某地方法院',
    documentDate: '2026-09-12',
    signature: '原告甲',
    ...overrides
  };
}

function completeReview(input = completeInput()) {
  const draft = buildStructuredPleadingDraft(input);
  const complianceFindings = verifyPleadingCompliance({
    draft,
    caseInput: input,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences
  });
  const documentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  return {
    draft,
    caseInput: input,
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    complianceFindings,
    citationVerification: verifyGeneratedDocument(documentText),
    formatFinding: verifyGenerationTemplate('civil', FORMAT_PROFILES.civil),
    appliedFormatProfile: FORMAT_PROFILES.civil
  };
}

describe('reviewStructuredPleading', () => {
  it('binds the report to stable SHA-256 fingerprints of all reviewed payloads', async () => {
    const review = completeReview();
    const report = await reviewStructuredPleading(review);

    expect(report.draftFingerprint).toBe(await fingerprintReviewPayload(review.draft));
    expect(report.caseInputFingerprint).toBe(await fingerprintReviewPayload(review.caseInput));
    expect(report.ruleProfileFingerprint).toBe(await fingerprintReviewPayload(review.ruleProfile));
    expect(report.draftFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(await fingerprintReviewPayload({ b: 2, a: 1 })).toBe(
      await fingerprintReviewPayload({ a: 1, b: 2 })
    );
  });

  it('accepts Generator source IDs as support-chain tracing without requiring source text duplication', async () => {
    const report = await reviewStructuredPleading(completeReview());

    expect(report.findings.find(finding => finding.id === 'P6.FACTS.TRACEABILITY')).toMatchObject({
      status: 'COMPLIANT' as const
    });
  });

  it('keeps legal-content Finding IDs stable when P5 findings are reordered', async () => {
    const first = completeReview();
    const second = completeReview();
    second.complianceFindings.reverse();

    const firstIds = (await reviewStructuredPleading(first)).findings
      .filter(item => item.category === 'LEGAL_CONTENT').map(item => item.id).sort();
    const secondIds = (await reviewStructuredPleading(second)).findings
      .filter(item => item.category === 'LEGAL_CONTENT').map(item => item.id).sort();

    expect(secondIds).toEqual(firstIds);
    expect(firstIds).toContain('P6.LEGAL_CONTENT.CIVIL_116_1');
  });

  it('keeps distinct citation Finding IDs stable when verifier results are reordered', async () => {
    const build = (reverse: boolean) => {
      const review = completeReview();
      const citations = [
        {
          verified: false, citationText: '民法第184條', type: 'STATUTE' as const,
          officialTitle: '', officialSourceUrl: '', isGhostOrFake: false, hallucinationRisk: 'UNVERIFIED' as const
        },
        {
          verified: false, citationText: '民法第185條', type: 'STATUTE' as const,
          officialTitle: '', officialSourceUrl: '', isGhostOrFake: false, hallucinationRisk: 'UNVERIFIED' as const
        }
      ];
      review.citationVerification = {
        documentText: review.draft.sections.map(section => section.content).filter(Boolean).join('\n'),
        antiGhostVerification: {
          totalCitationsChecked: 2,
          ghostCitationsFound: 0,
          verificationPassed: false,
          verifiedCitations: reverse ? citations.reverse() : citations
        }
      };
      return review;
    };

    const firstIds = (await reviewStructuredPleading(build(false))).findings
      .filter(item => item.id.startsWith('P6.CITATION.STATUTE')).map(item => item.id).sort();
    const secondIds = (await reviewStructuredPleading(build(true))).findings
      .filter(item => item.id.startsWith('P6.CITATION.STATUTE')).map(item => item.id).sort();
    expect(secondIds).toEqual(firstIds);
  });

  it('rejects non-JSON fingerprint payloads and non-finite numbers', async () => {
    await expect(fingerprintReviewPayload({ value: new Date() })).rejects.toThrow('plain JSON objects');
    await expect(fingerprintReviewPayload({ value: Number.NaN })).rejects.toThrow('finite JSON numbers');
  });
  it('runs all six objective review categories without making a final-gate decision', async () => {
    const review = completeReview();
    const report = await reviewStructuredPleading(review);
    const categories: ReviewCategory[] = [
      'STRUCTURAL', 'LEGAL_CONTENT', 'CITATION', 'FACT_CONSISTENCY', 'EVIDENCE_MAPPING', 'FORMAT'
    ];

    expect(report.objectiveChecks.map(check => check.category)).toEqual(categories);
    expect(categories.every(category => report.findings.some(finding => finding.category === category))).toBe(true);
    expect(report).toMatchObject({
      draftId: review.draft.id,
      caseInputId: review.caseInput.id,
      ruleProfileId: CIVIL_CONTENT_RULE_PROFILE.id,
      ruleProfileVersion: CIVIL_CONTENT_RULE_PROFILE.version
    });
    expect(report).not.toHaveProperty('ready');
    expect(report).not.toHaveProperty('approved');
    expect(report.findings.every(finding => finding.id && finding.objectiveBasis.length)).toBe(true);
  });

  it('does not mutate the draft, input, profile, or supplied verifier findings', async () => {
    const review = completeReview();
    const before = structuredClone(review);

    await reviewStructuredPleading(review);

    expect(review).toEqual(before);
  });

  it('preserves recommended rules as warnings instead of upgrading them to required', async () => {
    const report = await reviewStructuredPleading(completeReview());

    expect(report.findings.find(finding => finding.ruleId === 'CIVIL_116_RECOMMENDED_IDENTIFIERS')).toMatchObject({
      category: 'LEGAL_CONTENT',
      status: 'WARNING'
    });
  });

  it('fails closed when compliance, citation, or format evidence is missing', async () => {
    const review = completeReview();
    const report = await reviewStructuredPleading({
      draft: review.draft,
      caseInput: review.caseInput,
      ruleProfile: review.ruleProfile
    });

    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P6.LEGAL_CONTENT.MISSING_EVIDENCE', status: 'UNVERIFIED' }),
      expect.objectContaining({ id: 'P6.CITATION.MISSING_EVIDENCE', status: 'UNVERIFIED' }),
      expect.objectContaining({ id: 'P6.FORMAT.MISSING_EVIDENCE', status: 'UNVERIFIED' })
    ]));
  });

  it('detects incomplete Compliance Engine coverage', async () => {
    const review = completeReview();
    review.complianceFindings.pop();

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.LEGAL_CONTENT.COVERAGE',
      status: 'CONFLICT'
    }));
  });

  it('detects invented content and negative-proof drift independently of P5 findings', async () => {
    const review = completeReview();
    review.draft.sections.find(section => section.id === 'statements')!.content += '\n被告已自認全部債務。';
    review.draft.factsUsed = [];
    review.draft.factsUnused = ['fact-1'];

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.FACTS.TRACEABILITY',
      status: 'CONFLICT'
    }));
  });

  it('detects an unused CaseInput fact inserted without source tracing', async () => {
    const input = completeInput({
      facts: [
        { id: 'fact-1', content: '被告未履行契約。', sourceLevel: 'EVIDENCE_BACKED', evidenceIds: ['evidence-1'] },
        { id: 'fact-unused', content: '未獲主張採用的事實。', sourceLevel: 'USER_PROVIDED_FACT' }
      ]
    });
    const review = completeReview(input);
    review.draft.sections.find(section => section.id === 'statements')!.content += '\n未獲主張採用的事實。';

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.FACTS.TRACEABILITY',
      status: 'CONFLICT'
    }));
  });

  it('detects stale P5 findings when a valid value is moved into the wrong section', async () => {
    const review = completeReview();
    review.draft.sections.find(section => section.id === 'court')!.content = review.caseInput.signature!;

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.FACTS.TRACEABILITY',
      status: 'CONFLICT'
    }));
  });

  it('detects broken Claim–Fact–Evidence mappings', async () => {
    const review = completeReview();
    review.caseInput.facts[0].evidenceIds = ['missing-evidence'];

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.EVIDENCE.MAPPING',
      status: 'CONFLICT'
    }));
  });

  it('detects disclosure of a protected actual address', async () => {
    const review = completeReview(completeInput({
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
    }));
    review.draft.sections.find(section => section.id === 'statements')!.content += '\n秘密實際地址';

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.FACTS.TRACEABILITY',
      status: 'CONFLICT'
    }));
  });

  it('requires citation claim support and validates evidence against the current draft', async () => {
    const review = completeReview();
    review.citationVerification = {
      documentText: review.draft.sections.map(section => section.content).filter(Boolean).join('\n'),
      antiGhostVerification: {
        totalCitationsChecked: 1,
        ghostCitationsFound: 0,
        verificationPassed: true,
        verifiedCitations: [{
          verified: true,
          citationText: '民事訴訟法第116條',
          type: 'STATUTE',
          officialTitle: '民事訴訟法第116條',
          officialSourceUrl: 'https://law.moj.gov.tw/',
          isGhostOrFake: false,
          hallucinationRisk: 'SAFE_VERIFIED',
          verificationStatus: 'VERIFIED',
          claimSupportStatus: 'NEEDS_REVIEW'
        }]
      }
    };

    const report = await reviewStructuredPleading(review);

    expect(report.findings.find(finding => finding.category === 'CITATION' && finding.ruleId === '民事訴訟法第116條')?.status).toBe('UNVERIFIED');
  });

  it('detects structural and format findings for a different contract', async () => {
    const review = completeReview();
    review.draft.ruleProfileVersion = 'wrong-version';
    review.formatFinding = { ruleId: 'FORMAT_PROFILE.family', status: 'COMPLIANT' };

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P6.STRUCTURE.CONTRACT', status: 'CONFLICT' }),
      expect.objectContaining({ id: 'P6.FORMAT.RESULT', status: 'CONFLICT' })
    ]));
  });

  it('detects matching but unauthorized Requirement Level changes in both structures', async () => {
    const review = completeReview();
    const section = review.draft.sections.find(item => item.id === 'parties')!;
    const definition = review.draft.structure.sections.find(item => item.id === 'parties')!;
    section.requirementLevels = ['RECOMMENDED'];
    definition.requirementLevels = ['RECOMMENDED'];

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.STRUCTURE.CONTRACT',
      status: 'CONFLICT'
    }));
  });

  it('rejects a forged COMPLIANT format finding for a mismatched applied profile', async () => {
    const review = completeReview();
    review.appliedFormatProfile = {
      ...FORMAT_PROFILES.civil,
      marginsCm: { top: 1, bottom: 1, left: 1, right: 1 }
    };
    review.formatFinding = { ruleId: 'FORMAT_PROFILE.civil', status: 'COMPLIANT' };

    const report = await reviewStructuredPleading(review);

    expect(report.findings).toContainEqual(expect.objectContaining({
      id: 'P6.FORMAT.RESULT',
      status: 'CONFLICT'
    }));
  });
});
