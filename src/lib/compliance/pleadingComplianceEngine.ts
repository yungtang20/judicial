import type {
  CaseInput,
  ComplianceFinding,
  ContentRule,
  DraftSection,
  LegalReference,
  Party,
  PleadingRuleProfile,
  StructuredPleadingDraft
} from '../../types/compliance';

export interface PleadingComplianceInput {
  draft: StructuredPleadingDraft;
  caseInput: CaseInput;
  ruleProfile: PleadingRuleProfile;
  legalReferences: LegalReference[];
}

type RuleResult = Pick<ComplianceFinding, 'status' | 'evidenceLocation' | 'note'>;
type RuleValidator = (
  section: DraftSection,
  caseInput: CaseInput,
  draft: StructuredPleadingDraft
) => RuleResult;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sameIds(actual: string[] | undefined, expected: string[]): boolean {
  const uniqueExpected = [...new Set(expected)];
  return (
    actual?.length === uniqueExpected.length &&
    new Set(actual).size === actual.length &&
    uniqueExpected.every(id => actual.includes(id))
  );
}

function containsAll(content: string, expected: string[]): boolean {
  return expected.every(value => content.includes(value));
}

function isRepresentative(party: Party): boolean {
  return party.role === 'legal_representative' || party.role === 'litigation_representative';
}

function publicAddress(party: Party): string {
  const protection = party.addressProtection;
  if (protection?.requested || protection?.actualAddressStorage === 'protected') {
    return text(protection.publicDocumentAddress) || text(protection.serviceAddress);
  }
  return text(party.address) || text(protection?.publicDocumentAddress);
}

function result(
  status: ComplianceFinding['status'],
  section: DraftSection,
  note: string
): RuleResult {
  return { status, evidenceLocation: `sections.${section.id}`, note };
}

function expectedClaims(input: CaseInput) {
  return Array.isArray(input.claims) ? input.claims.filter(claim => text(claim.statement)) : [];
}

function expectedFacts(input: CaseInput) {
  const ids = new Set(expectedClaims(input).flatMap(claim => claim.factIds || []));
  return (Array.isArray(input.facts) ? input.facts : []).filter(fact => ids.has(fact.id));
}

function expectedEvidence(input: CaseInput) {
  const ids = new Set([
    ...expectedClaims(input).flatMap(claim => claim.evidenceIds || []),
    ...expectedFacts(input).flatMap(fact => fact.evidenceIds || [])
  ]);
  return (Array.isArray(input.evidence) ? input.evidence : []).filter(item => ids.has(item.id));
}

const validateParties: RuleValidator = (section, input, draft) => {
  const parties = input.parties.filter(party => !isRepresentative(party));
  if (!parties.length) return result('MISSING', section, 'CaseInput 未提供當事人。');
  if (parties.some(party => !text(party.name) || !publicAddress(party))) {
    return result('MISSING', section, '當事人姓名或公開地址不足。');
  }
  const expected = parties.flatMap(party => [text(party.name), publicAddress(party)]).filter(Boolean);
  const protectedAddresses = input.parties
    .filter(party => party.addressProtection?.requested || party.addressProtection?.actualAddressStorage === 'protected')
    .map(party => text(party.address))
    .filter(Boolean);
  if (protectedAddresses.some(address => draft.sections.some(item => item.content.includes(address)))) {
    return result('CONFLICT', section, '草稿包含應受保護的實際地址。');
  }
  return containsAll(section.content, expected)
    ? result('COMPLIANT', section, '當事人資料與 CaseInput 一致。')
    : result('CONFLICT', section, '當事人姓名或公開地址與 CaseInput 不一致。');
};

const validateRepresentatives: RuleValidator = (section, input) => {
  const representatives = input.parties.filter(isRepresentative);
  if (!representatives.length) return result('NOT_APPLICABLE', section, 'CaseInput 未提供代理人。');
  const expected = representatives
    .flatMap(party => [
      text(party.name),
      publicAddress(party),
      ...(party.role === 'legal_representative' ? [text(party.relationshipToParty)] : [])
    ])
    .filter(Boolean);
  if (representatives.some(party =>
    !text(party.name) ||
    !publicAddress(party) ||
    (party.role === 'legal_representative' && !text(party.relationshipToParty))
  )) {
    return result('MISSING', section, '代理人姓名、公開地址或法定代理人關係不足。');
  }
  return containsAll(section.content, expected)
    ? result('COMPLIANT', section, '代理人資料與 CaseInput 一致。')
    : result('CONFLICT', section, '代理人資料與 CaseInput 不一致。');
};

function exactField(value: string | undefined, label: string): RuleValidator {
  return section => {
    const expected = text(value);
    if (!expected) return result('MISSING', section, `CaseInput 未提供${label}。`);
    return text(section.content) === expected
      ? result('COMPLIANT', section, `${label}與 CaseInput 一致。`)
      : result('CONFLICT', section, `${label}與 CaseInput 不一致。`);
  };
}

const validateClaims: RuleValidator = (section, input) => {
  const claims = expectedClaims(input);
  if (!claims.length) return result('MISSING', section, 'CaseInput 未提供聲明或陳述。');
  const factIds = new Set(input.facts.map(fact => fact.id));
  const evidenceIds = new Set(input.evidence.map(item => item.id));
  const contentMatches = containsAll(section.content, claims.map(claim => text(claim.statement)));
  const idsMatch =
    sameIds(section.sourceClaimIds, claims.map(claim => claim.id)) &&
    sameIds(section.sourceFactIds, claims.flatMap(claim => claim.factIds).filter(id => factIds.has(id))) &&
    sameIds(section.sourceEvidenceIds, claims.flatMap(claim => claim.evidenceIds || []).filter(id => evidenceIds.has(id)));
  return contentMatches && idsMatch
    ? result('COMPLIANT', section, '聲明內容及 Claim 追溯一致。')
    : result('CONFLICT', section, '聲明內容或 Claim 追溯不一致。');
};

const validateEvidence: RuleValidator = (section, input) => {
  const evidence = expectedEvidence(input);
  if (!evidence.length) return result('MISSING', section, '沒有與 Claim 或 Fact 對應的 Evidence。');
  const matches =
    containsAll(section.content, evidence.map(item => text(item.content))) &&
    sameIds(section.sourceEvidenceIds, evidence.map(item => item.id));
  return matches
    ? result('COMPLIANT', section, '證據內容及 Evidence 追溯一致。')
    : result('CONFLICT', section, '證據內容或 Evidence 追溯不一致。');
};

const validateAttachments: RuleValidator = (section, input) => {
  if (!Array.isArray(input.attachments)) return result('MISSING', section, 'CaseInput 未提供附件陣列。');
  const matches =
    containsAll(section.content, input.attachments.map(item => text(item.content))) &&
    section.content.includes(`件數：${input.attachments.length}`) &&
    sameIds(section.sourceEvidenceIds, input.attachments.map(item => item.id));
  return matches
    ? result('COMPLIANT', section, '附屬文件內容、件數及來源 ID 一致。')
    : result('CONFLICT', section, '附屬文件內容、件數或來源 ID 不一致。');
};

const validateIdentifiers: RuleValidator = (section, input) => {
  const identifiers = input.parties.flatMap(party => Object.values(party.identifiers || {})).map(text).filter(Boolean);
  if (!identifiers.length) return result('WARNING', section, '未提供第116條第2項宜記載的識別資料。');
  return containsAll(section.content, identifiers)
    ? result('COMPLIANT', section, '宜記載識別資料與 CaseInput 一致。')
    : result('CONFLICT', section, '已提供的識別資料未完整反映於草稿。');
};

const validateFacts: RuleValidator = (section, input) => {
  const facts = expectedFacts(input);
  if (!facts.length) return result('MISSING', section, '沒有與 Claim 對應的原因事實。');
  const matches =
    containsAll(section.content, facts.map(fact => text(fact.content))) &&
    sameIds(section.sourceFactIds, facts.map(fact => fact.id));
  return matches
    ? result('COMPLIANT', section, '原因事實內容及 Fact 追溯一致。')
    : result('CONFLICT', section, '原因事實內容或 Fact 追溯不一致。');
};

const validateOptionalComplaintDetails: RuleValidator = section =>
  text(section.content)
    ? result('UNVERIFIED', section, '存在宜記載內容，但目前沒有核准的結構化驗證欄位。')
    : result('WARNING', section, '未提供起訴狀宜記載事項。');

function validators(input: CaseInput): Record<string, RuleValidator> {
  return {
    parties: validateParties,
    representatives: validateRepresentatives,
    proceeding: exactField(input.proceeding, '訴訟事件'),
    statements: validateClaims,
    evidence: validateEvidence,
    attachments: validateAttachments,
    court: exactField(input.court, '法院'),
    date: exactField(input.documentDate, '日期'),
    party_identifiers: validateIdentifiers,
    signature: exactField(input.signature, '簽名或蓋章'),
    complaint_parties: validateParties,
    subject_and_facts: validateFacts,
    judgment_relief: validateClaims,
    complaint_optional_details: validateOptionalComplaintDetails
  };
}

function isApplicable(rule: ContentRule, input: CaseInput): boolean {
  return rule.appliesTo.includes(input.caseType) &&
    (!rule.pleadingTypes || rule.pleadingTypes.includes(input.pleadingType));
}

function legalSourcesVerified(rule: ContentRule, references: LegalReference[]): boolean {
  return Boolean(rule.sourceReferences?.length) && rule.sourceReferences!.every(source =>
    references.some(reference =>
      reference.sourceReference === source &&
      reference.verificationStatus === 'VERIFIED' &&
      Boolean(text(reference.contentHash))
    )
  );
}

export function verifyPleadingCompliance({
  draft,
  caseInput,
  ruleProfile,
  legalReferences
}: PleadingComplianceInput): ComplianceFinding[] {
  const ruleIdCounts = new Map<string, number>();
  ruleProfile.rules.forEach(rule => ruleIdCounts.set(rule.id, (ruleIdCounts.get(rule.id) || 0) + 1));
  const sectionValidators = validators(caseInput);
  const profileConflict =
    draft.ruleProfileVersion !== ruleProfile.version ||
    draft.caseType !== caseInput.caseType ||
    draft.pleadingType !== caseInput.pleadingType ||
    draft.structure.pleadingType !== caseInput.pleadingType ||
    ruleProfile.caseType !== caseInput.caseType ||
    Boolean(
      ruleProfile.supportedPleadingTypes &&
      !ruleProfile.supportedPleadingTypes.includes(caseInput.pleadingType)
    );

  return ruleProfile.rules.map(rule => {
    if (!isApplicable(rule, caseInput)) {
      return { ruleId: rule.id, status: 'NOT_APPLICABLE', note: '規則不適用此案件或書狀類型。' };
    }
    if (ruleIdCounts.get(rule.id)! > 1 || profileConflict) {
      return { ruleId: rule.id, status: 'CONFLICT', note: 'Rule Profile、Draft 或 CaseInput 契約衝突。' };
    }
    if (
      ruleProfile.verificationStatus !== 'VERIFIED' ||
      rule.level === 'UNVERIFIED' ||
      rule.level === 'RECOMMENDED_CANDIDATE' ||
      !legalSourcesVerified(rule, legalReferences)
    ) {
      return { ruleId: rule.id, status: 'UNVERIFIED', note: '規則或凍結法源尚未完成驗證。' };
    }
    if (rule.level !== 'REQUIRED' && rule.level !== 'RECOMMENDED') {
      return { ruleId: rule.id, status: 'UNVERIFIED', note: '未知 Requirement Level。' };
    }
    if (!rule.targetSection || !sectionValidators[rule.targetSection]) {
      return { ruleId: rule.id, status: 'UNVERIFIED', note: '沒有核准的 targetSection validator。' };
    }
    const matchingSections = draft.sections.filter(
      section => section.id === rule.targetSection && section.ruleIds.includes(rule.id)
    );
    if (matchingSections.length !== 1) {
      return {
        ruleId: rule.id,
        status: matchingSections.length ? 'CONFLICT' : rule.level === 'REQUIRED' ? 'MISSING' : 'WARNING',
        note: matchingSections.length ? '規則對應到重複 section。' : '草稿缺少規則對應 section。'
      };
    }
    const section = matchingSections[0];
    const structureMatches = draft.structure.sections.filter(
      definition => definition.id === rule.targetSection && definition.ruleIds.includes(rule.id)
    );
    if (
      structureMatches.length !== 1 ||
      section.sectionType !== rule.targetSection ||
      !section.requirementLevels.includes(rule.level) ||
      !structureMatches[0].requirementLevels.includes(rule.level) ||
      new Set(section.ruleIds).size !== section.ruleIds.length
    ) {
      return {
        ruleId: rule.id,
        status: 'CONFLICT',
        evidenceLocation: `sections.${section.id}`,
        note: 'Draft section 與 PleadingStructure／Rule Profile 不一致。'
      };
    }
    return {
      ruleId: rule.id,
      ...sectionValidators[rule.targetSection](section, caseInput, draft)
    };
  });
}
