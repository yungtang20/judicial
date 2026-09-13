import type { CitationVerificationResult } from '../../types';
import type {
  CaseInput,
  ComplianceFinding,
  FormatProfile,
  PleadingReviewReport,
  PleadingRuleProfile,
  ReviewCategory,
  ReviewFinding,
  ReviewerObjectiveCheck,
  StructuredPleadingDraft
} from '../../types/compliance';
import { FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';

export const PLEADING_REVIEWER_VERSION = '1.1.0';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Review fingerprints require finite JSON numbers.');
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Review fingerprints only accept plain JSON objects.');
    }
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  throw new Error('Review fingerprints only accept JSON-domain values.');
}

export async function fingerprintReviewPayload(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export interface CitationReviewEvidence {
  documentText: string;
  antiGhostVerification: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
    verificationPassed: boolean;
  };
}

export interface PleadingReviewInput {
  draft: StructuredPleadingDraft;
  caseInput: CaseInput;
  ruleProfile: PleadingRuleProfile;
  complianceFindings?: ComplianceFinding[];
  citationVerification?: CitationReviewEvidence;
  formatFinding?: ComplianceFinding;
  appliedFormatProfile?: FormatProfile;
}

export const REVIEWER_OBJECTIVE_CHECKS: ReviewerObjectiveCheck[] = [
  { id: 'P6.STRUCTURE', category: 'STRUCTURAL', description: 'Draft、PleadingStructure 與 Rule Profile 的版本、區段及 Rule ID 必須一致。' },
  { id: 'P6.LEGAL_CONTENT', category: 'LEGAL_CONTENT', description: '每條 Rule Profile 規則必須恰有一筆 Compliance Engine finding，且沿用其六態結果。' },
  { id: 'P6.CITATION', category: 'CITATION', description: '引用查證必須對應目前草稿；引用存在性與主張支持性均須有可回查結果。' },
  { id: 'P6.FACTS', category: 'FACT_CONSISTENCY', description: '草稿來源 ID、內容與 used/unused negative proof 必須可回查至 CaseInput。' },
  { id: 'P6.EVIDENCE', category: 'EVIDENCE_MAPPING', description: 'Claim、Fact 與 Evidence 關聯必須存在且 EVIDENCE_BACKED 事實須有有效證據。' },
  { id: 'P6.FORMAT', category: 'FORMAT', description: '格式 finding 必須來自目前案件類型的生成範本驗證。' }
];

function reviewFinding(
  id: string,
  category: ReviewCategory,
  status: ComplianceFinding['status'],
  note: string,
  objectiveBasis: string[],
  source: ReviewFinding['source'] = 'REVIEWER',
  evidenceLocation?: string,
  ruleId = id
): ReviewFinding {
  return { id, category, ruleId, status, note, objectiveBasis, source, evidenceLocation };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function sameSet(actual: string[], expected: string[]): boolean {
  return actual.length === unique(actual).length &&
    expected.length === unique(expected).length &&
    actual.length === expected.length &&
    expected.every(value => actual.includes(value));
}

function applicableRuleIds(input: CaseInput, profile: PleadingRuleProfile): string[] {
  return profile.rules
    .filter(rule => rule.appliesTo.includes(input.caseType) &&
      (!rule.pleadingTypes || rule.pleadingTypes.includes(input.pleadingType)))
    .map(rule => rule.id);
}

function structuralReview(input: PleadingReviewInput): ReviewFinding[] {
  const { draft, caseInput, ruleProfile } = input;
  const basis = ['P6.STRUCTURE'];
  const expectedRuleIds = applicableRuleIds(caseInput, ruleProfile);
  const expectedSections = unique(ruleProfile.rules
    .filter(rule => expectedRuleIds.includes(rule.id))
    .map(rule => rule.targetSection || ''));
  const structureIds = draft.structure.sections.map(section => section.id);
  const sectionIds = draft.sections.map(section => section.id);
  const contractMatches =
    draft.caseType === caseInput.caseType &&
    draft.pleadingType === caseInput.pleadingType &&
    draft.structure.pleadingType === caseInput.pleadingType &&
    draft.ruleProfileVersion === ruleProfile.version &&
    ruleProfile.caseType === caseInput.caseType &&
    ruleProfile.verificationStatus === 'VERIFIED' &&
    (!ruleProfile.supportedPleadingTypes || ruleProfile.supportedPleadingTypes.includes(caseInput.pleadingType));
  const sectionsMatch =
    sameSet(structureIds, expectedSections) &&
    sameSet(sectionIds, expectedSections) &&
    draft.sections.every(section => {
      const definition = draft.structure.sections.find(item => item.id === section.id);
      const expectedRules = ruleProfile.rules
        .filter(rule => expectedRuleIds.includes(rule.id) && rule.targetSection === section.id)
        .map(rule => rule.id);
      const expectedLevels = unique(ruleProfile.rules
        .filter(rule => expectedRules.includes(rule.id))
        .map(rule => rule.level));
      return Boolean(definition) &&
        section.sectionType === definition!.sectionType &&
        sameSet(section.ruleIds, expectedRules) &&
        sameSet(definition!.ruleIds, expectedRules) &&
        sameSet(section.requirementLevels, expectedLevels) &&
        sameSet(definition!.requirementLevels, expectedLevels);
    });
  const expectedOmitted = expectedSections.filter(id => !sectionIds.includes(id));

  return [reviewFinding(
    'P6.STRUCTURE.CONTRACT',
    'STRUCTURAL',
    contractMatches && sectionsMatch && sameSet(draft.omittedSectionIds, expectedOmitted) ? 'COMPLIANT' : 'CONFLICT',
    contractMatches && sectionsMatch && sameSet(draft.omittedSectionIds, expectedOmitted)
      ? '結構、版本、區段與 Rule Profile 一致。'
      : 'Draft、PleadingStructure、negative proof 或 Rule Profile 結構不一致。',
    basis,
    'REVIEWER',
    'draft.structure'
  )];
}

function legalContentReview(input: PleadingReviewInput): ReviewFinding[] {
  const basis = ['P6.LEGAL_CONTENT', 'Approved Rule Profile', 'P5 Compliance Engine findings'];
  if (!input.complianceFindings) {
    return [reviewFinding(
      'P6.LEGAL_CONTENT.MISSING_EVIDENCE',
      'LEGAL_CONTENT',
      'UNVERIFIED',
      '未提供 Compliance Engine findings，無法審查法律內容。',
      basis
    )];
  }

  const expectedIds = input.ruleProfile.rules.map(rule => rule.id);
  const actualIds = input.complianceFindings.map(finding => finding.ruleId);
  const coverage = sameSet(actualIds, expectedIds);
  const findings = expectedIds.map(ruleId => {
    const matches = input.complianceFindings!.filter(finding => finding.ruleId === ruleId);
    const finding = matches[0];
    return reviewFinding(
      `P6.LEGAL_CONTENT.${ruleId}`,
      'LEGAL_CONTENT',
      matches.length === 1 ? finding.status : 'CONFLICT',
      matches.length === 1
        ? finding.note || 'Compliance Engine 未提供說明。'
        : `Rule ${ruleId} 的 Compliance finding 數量不是一筆。`,
      basis,
      'COMPLIANCE_ENGINE',
      finding?.evidenceLocation,
      ruleId
    );
  });

  if (!coverage) {
    findings.unshift(reviewFinding(
      'P6.LEGAL_CONTENT.COVERAGE',
      'LEGAL_CONTENT',
      'CONFLICT',
      'Compliance findings 與 Rule Profile 未形成一對一完整覆蓋。',
      basis
    ));
  }
  return findings;
}

function draftText(draft: StructuredPleadingDraft): string {
  return draft.sections.map(section => section.content).filter(Boolean).join('\n');
}

function citationStatus(citation: CitationVerificationResult): ComplianceFinding['status'] {
  if (
    citation.isGhostOrFake ||
    citation.verificationStatus === 'REJECTED' ||
    citation.claimSupportStatus === 'CONTRADICTED'
  ) return 'CONFLICT';
  if (
    !citation.verified ||
    !citation.verificationStatus ||
    !['AUTHORITATIVE', 'VERIFIED'].includes(citation.verificationStatus) ||
    citation.claimSupportStatus !== 'SUPPORTED'
  ) return 'UNVERIFIED';
  return 'COMPLIANT';
}

function citationStableKey(citation: CitationVerificationResult): string {
  const normalized = text(citation.citationText).normalize('NFKC').replace(/\s+/g, '');
  return encodeURIComponent(`${citation.type || 'UNKNOWN'}:${normalized || 'EMPTY'}`);
}

function citationReview(input: PleadingReviewInput): ReviewFinding[] {
  const basis = ['P6.CITATION', 'Anti-Ghost citation verification evidence'];
  const verification = input.citationVerification;
  if (!verification) {
    return [reviewFinding(
      'P6.CITATION.MISSING_EVIDENCE',
      'CITATION',
      'UNVERIFIED',
      '未提供目前草稿的引用查證結果。',
      basis
    )];
  }

  const evidence = verification.antiGhostVerification;
  const citations = evidence.verifiedCitations;
  const currentText = draftText(input.draft);
  const countersMatch =
    evidence.totalCitationsChecked === citations.length &&
    evidence.ghostCitationsFound === citations.filter(item => item.isGhostOrFake).length &&
    evidence.verificationPassed === (
      evidence.ghostCitationsFound === 0 &&
      (citations.length === 0 || citations.every(item => item.verified))
    );
  const findings: ReviewFinding[] = [];

  if (verification.documentText !== currentText || !countersMatch) {
    findings.push(reviewFinding(
      'P6.CITATION.EVIDENCE_CONTRACT',
      'CITATION',
      'CONFLICT',
      '引用查證文字或計數與目前草稿不一致。',
      basis,
      'CITATION_VERIFIER',
      'citationVerification'
    ));
  }
  if (!citations.length) {
    findings.push(reviewFinding(
      'P6.CITATION.SCAN',
      'CITATION',
      input.draft.legalReferencesUsed.length ? 'UNVERIFIED' : 'COMPLIANT',
      input.draft.legalReferencesUsed.length
        ? '草稿宣告使用法律引用，但引用掃描沒有可回查結果。'
        : '目前草稿未宣告或掃描出法律引用。',
      basis,
      'CITATION_VERIFIER'
    ));
  } else {
    const occurrences = new Map<string, number>();
    citations.forEach((citation, index) => {
      const key = citationStableKey(citation);
      const occurrence = (occurrences.get(key) || 0) + 1;
      occurrences.set(key, occurrence);
      findings.push(reviewFinding(
      `P6.CITATION.${key}.${occurrence}`,
      'CITATION',
      citationStatus(citation),
      citationStatus(citation) === 'COMPLIANT'
        ? '引用存在性及其法律主張支持性均已有查證證據。'
        : '引用存在性或其法律主張支持性尚未通過查證。',
      basis,
      'CITATION_VERIFIER',
      `citationVerification.verifiedCitations[${index}]`,
      citation.citationText || `CITATION_${index + 1}`
    ));
    });
  }
  return findings;
}

function publicAddress(party: CaseInput['parties'][number]): string {
  const protection = party.addressProtection;
  if (protection?.requested || protection?.actualAddressStorage === 'protected') {
    return text(protection.publicDocumentAddress) || text(protection.serviceAddress);
  }
  return text(party.address) || text(protection?.publicDocumentAddress);
}

function partyLines(input: CaseInput, representatives: boolean): string[] {
  return input.parties
    .filter(party => (
      party.role === 'legal_representative' || party.role === 'litigation_representative'
    ) === representatives)
    .flatMap(party => {
      const address = publicAddress(party);
      return [
        text(party.name) && `${party.role}：${text(party.name)}`,
        address && `${party.role}住所或送達處所：${address}`,
        representatives && text(party.relationshipToParty)
          ? `與當事人之關係：${text(party.relationshipToParty)}`
          : ''
      ].filter(Boolean);
    });
}

function expectedSectionLines(section: StructuredPleadingDraft['sections'][number], input: CaseInput): string[] {
  const claims = (section.sourceClaimIds || [])
    .map(id => input.claims.find(item => item.id === id)?.statement || '')
    .filter(Boolean);
  const facts = (section.sourceFactIds || [])
    .map(id => input.facts.find(item => item.id === id)?.content || '')
    .filter(Boolean);
  const allEvidence = [...input.evidence, ...input.attachments];
  const evidence = (section.sourceEvidenceIds || [])
    .map(id => allEvidence.find(item => item.id === id)?.content || '')
    .filter(Boolean);

  switch (section.id) {
    case 'parties':
    case 'complaint_parties':
      return partyLines(input, false);
    case 'representatives':
      return partyLines(input, true);
    case 'proceeding':
      return [text(input.proceeding)].filter(Boolean);
    case 'statements':
    case 'judgment_relief':
      return claims;
    case 'evidence':
      return evidence;
    case 'attachments':
      return [...evidence, `件數：${input.attachments.length}`];
    case 'court':
      return [text(input.court)].filter(Boolean);
    case 'date':
      return [text(input.documentDate)].filter(Boolean);
    case 'signature':
      return [text(input.signature)].filter(Boolean);
    case 'subject_and_facts':
      return facts;
    case 'party_identifiers':
      return input.parties.flatMap(party => Object.entries(party.identifiers || {})
        .filter(([, value]) => text(value))
        .map(([key, value]) => `${party.id}.${key}：${text(value)}`));
    case 'complaint_optional_details':
      return [];
    default:
      return [];
  }
}

function sourceIdsInDraft(draft: StructuredPleadingDraft, key: 'sourceClaimIds' | 'sourceFactIds' | 'sourceEvidenceIds'): string[] {
  return unique(draft.sections.flatMap(section => section[key] || []));
}

function factConsistencyReview(input: PleadingReviewInput): ReviewFinding[] {
  const basis = ['P6.FACTS', 'CaseInput source IDs and content', 'StructuredPleadingDraft negative proof'];
  const { draft, caseInput } = input;
  const claimIds = caseInput.claims.map(item => item.id);
  const factIds = caseInput.facts.map(item => item.id);
  const evidenceIds = [...caseInput.evidence, ...caseInput.attachments].map(item => item.id);
  const partitionsMatch =
    sameSet(draft.claimsUsed, sourceIdsInDraft(draft, 'sourceClaimIds')) &&
    sameSet([...draft.claimsUsed, ...draft.claimsUnused], claimIds) &&
    !draft.claimsUsed.some(id => draft.claimsUnused.includes(id)) &&
    sameSet(draft.factsUsed, sourceIdsInDraft(draft, 'sourceFactIds')) &&
    sameSet([...draft.factsUsed, ...draft.factsUnused], factIds) &&
    !draft.factsUsed.some(id => draft.factsUnused.includes(id)) &&
    sameSet(draft.evidenceUsed, sourceIdsInDraft(draft, 'sourceEvidenceIds')) &&
    sameSet([...draft.evidenceUsed, ...draft.evidenceUnused], evidenceIds) &&
    !draft.evidenceUsed.some(id => draft.evidenceUnused.includes(id));
  const renderedLines = new Set(
    draft.sections.flatMap(section => section.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
  );
  const contentMatches = draft.sections.every(section =>
    sameSet(
      section.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
      expectedSectionLines(section, caseInput)
    )
  );
  const contentUsageMatches =
    caseInput.claims.every(item => renderedLines.has(text(item.statement)) === draft.claimsUsed.includes(item.id)) &&
    caseInput.facts.every(item => renderedLines.has(text(item.content)) === draft.factsUsed.includes(item.id)) &&
    [...caseInput.evidence, ...caseInput.attachments].every(
      item => renderedLines.has(text(item.content)) === draft.evidenceUsed.includes(item.id)
    );
  const sourceContentMatches = draft.sections.every(section =>
    (section.sourceClaimIds || []).every(id => {
      const source = caseInput.claims.find(item => item.id === id);
      return Boolean(source && section.content.includes(source.statement));
    }) &&
    (section.sourceFactIds || []).every(id => {
      const source = caseInput.facts.find(item => item.id === id);
      const supportsClaim = (section.sourceClaimIds || []).some(claimId =>
        caseInput.claims.find(item => item.id === claimId)?.factIds.includes(id)
      );
      return Boolean(source && (section.content.includes(source.content) || supportsClaim));
    }) &&
    (section.sourceEvidenceIds || []).every(id => {
      const source = [...caseInput.evidence, ...caseInput.attachments].find(item => item.id === id);
      const supportsClaim = (section.sourceClaimIds || []).some(claimId =>
        caseInput.claims.find(item => item.id === claimId)?.evidenceIds?.includes(id)
      );
      const supportsFact = (section.sourceFactIds || []).some(factId =>
        caseInput.facts.find(item => item.id === factId)?.evidenceIds?.includes(id)
      );
      return Boolean(source && (section.content.includes(source.content) || supportsClaim || supportsFact));
    })
  );
  const protectedAddresses = caseInput.parties
    .filter(party => party.addressProtection?.requested || party.addressProtection?.actualAddressStorage === 'protected')
    .map(party => text(party.address))
    .filter(Boolean);
  const protectedAddressesAbsent = protectedAddresses.every(
    address => !draft.sections.some(section => section.content.includes(address))
  );
  const compliant =
    partitionsMatch &&
    contentMatches &&
    contentUsageMatches &&
    sourceContentMatches &&
    protectedAddressesAbsent;

  return [reviewFinding(
    'P6.FACTS.TRACEABILITY',
    'FACT_CONSISTENCY',
    compliant ? 'COMPLIANT' : 'CONFLICT',
    compliant
      ? '內容、來源 ID、negative proof 與受保護地址均和 CaseInput 一致。'
      : '草稿包含未獲 CaseInput 支持的內容、來源 ID／negative proof 不一致，或洩漏受保護地址。',
    basis,
    'REVIEWER',
    'draft.sections'
  )];
}

function evidenceMappingReview(input: PleadingReviewInput): ReviewFinding[] {
  const basis = ['P6.EVIDENCE', 'CaseInput Claim–Fact–Evidence relations'];
  const factIds = new Set(input.caseInput.facts.map(item => item.id));
  const evidenceIds = new Set(input.caseInput.evidence.map(item => item.id));
  const invalidClaimLink = input.caseInput.claims.some(claim =>
    !claim.factIds.length ||
    claim.factIds.some(id => !factIds.has(id)) ||
    (claim.evidenceIds || []).some(id => !evidenceIds.has(id))
  );
  const invalidFactLink = input.caseInput.facts.some(fact =>
    fact.sourceLevel === 'EVIDENCE_BACKED' &&
    (!fact.evidenceIds?.length || fact.evidenceIds.some(id => !evidenceIds.has(id)))
  );

  return [reviewFinding(
    'P6.EVIDENCE.MAPPING',
    'EVIDENCE_MAPPING',
    invalidClaimLink || invalidFactLink ? 'CONFLICT' : 'COMPLIANT',
    invalidClaimLink || invalidFactLink
      ? 'Claim、Fact 或 EVIDENCE_BACKED Evidence 關聯缺失或無法回查。'
      : 'Claim、Fact 與 Evidence 關聯均可回查。',
    basis,
    'REVIEWER',
    'caseInput.claims'
  )];
}

function formatReview(input: PleadingReviewInput): ReviewFinding[] {
  const basis = ['P6.FORMAT', 'P5 verifyGenerationTemplate finding'];
  const finding = input.formatFinding;
  const applied = input.appliedFormatProfile;
  if (!finding || !applied) {
    return [reviewFinding(
      'P6.FORMAT.MISSING_EVIDENCE',
      'FORMAT',
      'UNVERIFIED',
      '未提供生成範本格式驗證結果或實際套用的 FormatProfile。',
      basis
    )];
  }
  const expectedRuleId = `FORMAT_PROFILE.${input.caseInput.caseType}`;
  const expected = FORMAT_PROFILES[input.ruleProfile.formatProfileId || input.caseInput.caseType];
  const signature = (profile: FormatProfile) => JSON.stringify([
    profile.caseType,
    profile.formatRuleSource,
    profile.formatConfirmed,
    profile.paperSize,
    profile.writingDirection,
    profile.marginsCm?.top ?? null,
    profile.marginsCm?.bottom ?? null,
    profile.marginsCm?.left ?? null,
    profile.marginsCm?.right ?? null,
    profile.fontSizePt?.min ?? null,
    profile.fontSizePt?.max ?? null,
    profile.lineSpacingPt?.mode ?? null,
    profile.lineSpacingPt?.min ?? null,
    profile.lineSpacingPt?.max ?? null,
    profile.pageNumbering,
    profile.tocThresholdPages ?? null,
    profile.doubleSidedPrint
  ]);
  const independentlyVerifiedStatus: ComplianceFinding['status'] =
    !expected.formatConfirmed || !applied.formatConfirmed
      ? 'UNVERIFIED'
      : signature(applied) === signature(expected) ? 'COMPLIANT' : 'CONFLICT';
  const evidenceMatches =
    finding.ruleId === expectedRuleId &&
    finding.status === independentlyVerifiedStatus;
  return [reviewFinding(
    'P6.FORMAT.RESULT',
    'FORMAT',
    evidenceMatches ? independentlyVerifiedStatus : 'CONFLICT',
    evidenceMatches
      ? finding.note || '格式驗證器未提供說明。'
      : '格式 finding、實際 FormatProfile 或目前案件類型互相衝突。',
    basis,
    'FORMAT_VERIFIER',
    finding.evidenceLocation,
    finding.ruleId
  )];
}

export async function reviewStructuredPleading(input: PleadingReviewInput): Promise<PleadingReviewReport> {
  return {
    draftId: input.draft.id,
    draftFingerprint: await fingerprintReviewPayload(input.draft),
    caseInputId: input.caseInput.id,
    caseInputFingerprint: await fingerprintReviewPayload(input.caseInput),
    ruleProfileId: input.ruleProfile.id,
    ruleProfileVersion: input.ruleProfile.version,
    ruleProfileFingerprint: await fingerprintReviewPayload(input.ruleProfile),
    reviewerVersion: PLEADING_REVIEWER_VERSION,
    objectiveChecks: REVIEWER_OBJECTIVE_CHECKS.map(check => ({ ...check })),
    findings: [
      ...structuralReview(input),
      ...legalContentReview(input),
      ...citationReview(input),
      ...factConsistencyReview(input),
      ...evidenceMappingReview(input),
      ...formatReview(input)
    ]
  };
}
