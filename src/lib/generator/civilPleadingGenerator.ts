import type {
  CaseInput,
  ContentRule,
  DraftSection,
  MissingInput,
  Party,
  PleadingRuleProfile,
  PleadingStructure,
  RequirementLevel,
  StructuredPleadingDraft
} from '../../types/compliance';
import { CIVIL_CONTENT_RULE_PROFILE } from '../rules/civilPleadingRuleProfile';

type SectionValue = {
  content: string;
  sourceClaimIds?: string[];
  sourceFactIds?: string[];
  sourceEvidenceIds?: string[];
};

type RequiredField = { field: string; value?: string };

const SECTION_TITLES: Readonly<Record<string, string>> = {
  parties: '當事人',
  representatives: '代理人',
  proceeding: '訴訟事件',
  statements: '聲明或陳述',
  evidence: '證據',
  attachments: '附屬文件',
  court: '法院',
  date: '日期',
  party_identifiers: '當事人識別資料',
  signature: '簽名或蓋章',
  complaint_parties: '起訴當事人',
  subject_and_facts: '訴訟標的及原因事實',
  judgment_relief: '應受判決事項之聲明',
  complaint_optional_details: '起訴狀宜記載事項'
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parties(input: CaseInput): Party[] {
  return Array.isArray(input.parties) ? input.parties : [];
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

function renderParties(input: CaseInput, representatives: boolean): SectionValue {
  const selected = parties(input).filter(party => isRepresentative(party) === representatives);
  return {
    content: selected
      .flatMap(party => {
        const address = publicAddress(party);
        return [
          text(party.name) && `${party.role}：${text(party.name)}`,
          address && `${party.role}住所或送達處所：${address}`,
          representatives && text(party.relationshipToParty)
            ? `與當事人之關係：${text(party.relationshipToParty)}`
            : ''
        ].filter(Boolean);
      })
      .join('\n')
  };
}

function renderIdentifiers(input: CaseInput): SectionValue {
  return {
    content: parties(input)
      .flatMap(party =>
        Object.entries(party.identifiers || {})
          .filter(([, value]) => text(value))
          .map(([key, value]) => `${party.id}.${key}：${text(value)}`)
      )
      .join('\n')
  };
}

function renderSources(
  sources: Array<{ id: string; content: string }> | undefined,
  idType: 'fact' | 'evidence'
): SectionValue {
  const valid = (Array.isArray(sources) ? sources : []).filter(source => text(source.content));
  return {
    content: valid.map(source => text(source.content)).join('\n'),
    ...(idType === 'fact'
      ? { sourceFactIds: valid.map(source => source.id).filter(Boolean) }
      : { sourceEvidenceIds: valid.map(source => source.id).filter(Boolean) })
  };
}

function renderAttachments(input: CaseInput): SectionValue {
  if (!Array.isArray(input.attachments)) return { content: '' };
  const attachments = input.attachments.filter(attachment => text(attachment.content));
  return {
    content: `${attachments.map(attachment => text(attachment.content)).join('\n')}${
      attachments.length ? '\n' : ''
    }件數：${attachments.length}`,
    sourceEvidenceIds: attachments.map(attachment => attachment.id).filter(Boolean)
  };
}

function renderClaims(input: CaseInput): SectionValue {
  const claims = (Array.isArray(input.claims) ? input.claims : []).filter(claim => text(claim.statement));
  const factIds = new Set((Array.isArray(input.facts) ? input.facts : []).map(fact => fact.id));
  const evidenceIds = new Set((Array.isArray(input.evidence) ? input.evidence : []).map(item => item.id));
  return {
    content: claims.map(claim => text(claim.statement)).join('\n'),
    sourceClaimIds: claims.map(claim => claim.id).filter(Boolean),
    sourceFactIds: claims.flatMap(claim => claim.factIds || []).filter(id => factIds.has(id)),
    sourceEvidenceIds: claims.flatMap(claim => claim.evidenceIds || []).filter(id => evidenceIds.has(id))
  };
}

function referencedFacts(input: CaseInput) {
  const ids = new Set(
    (Array.isArray(input.claims) ? input.claims : []).flatMap(claim => claim.factIds || [])
  );
  return (Array.isArray(input.facts) ? input.facts : []).filter(fact => ids.has(fact.id));
}

function referencedEvidence(input: CaseInput) {
  const facts = referencedFacts(input);
  const ids = new Set([
    ...(Array.isArray(input.claims) ? input.claims : []).flatMap(claim => claim.evidenceIds || []),
    ...facts.flatMap(fact => fact.evidenceIds || [])
  ]);
  return (Array.isArray(input.evidence) ? input.evidence : []).filter(item => ids.has(item.id));
}

function sectionValues(input: CaseInput): Record<string, SectionValue> {
  const partySection = renderParties(input, false);
  const claimSection = renderClaims(input);
  return {
    parties: partySection,
    representatives: renderParties(input, true),
    proceeding: { content: text(input.proceeding) },
    statements: claimSection,
    evidence: renderSources(referencedEvidence(input), 'evidence'),
    attachments: renderAttachments(input),
    court: { content: text(input.court) },
    date: { content: text(input.documentDate) },
    party_identifiers: renderIdentifiers(input),
    signature: { content: text(input.signature) },
    complaint_parties: partySection,
    subject_and_facts: renderSources(referencedFacts(input), 'fact'),
    judgment_relief: claimSection,
    complaint_optional_details: { content: '' }
  };
}

function isApplicable(rule: ContentRule, input: CaseInput): boolean {
  return (
    rule.appliesTo.includes(input.caseType) &&
    (!rule.pleadingTypes || rule.pleadingTypes.includes(input.pleadingType))
  );
}

function missing(
  field: string,
  reason: string,
  requiredFor: string[],
  category: NonNullable<MissingInput['category']>,
  severity: MissingInput['severity'],
  sourceRequirement?: string
): MissingInput {
  return { field, reason, severity, requiredFor, sourceRequirement, category };
}

function sourceFindings(input: CaseInput): MissingInput[] {
  const findings: MissingInput[] = [];
  const requiredFor = [input.pleadingType];
  const collections = [
    ['facts', input.facts],
    ['evidence', input.evidence],
    ['attachments', input.attachments]
  ] as const;
  const ids = new Set<string>();

  for (const [field, sources] of collections) {
    if (!Array.isArray(sources)) continue;
    sources.forEach((source, index) => {
      const id = text(source.id);
      if (!id) {
        findings.push(
          missing(`${field}[${index}].id`, '來源缺少可回查 ID。', requiredFor, 'TRACEABILITY', 'BLOCKING')
        );
      } else if (ids.has(id)) {
        findings.push(
          missing(`${field}[${index}].id`, '來源 ID 重複，無法唯一回查。', requiredFor, 'TRACEABILITY', 'BLOCKING')
        );
      }
      if (!text(source.content)) {
        findings.push(
          missing(`${field}[${index}].content`, '來源缺少內容，無法建立追溯。', requiredFor, 'TRACEABILITY', 'BLOCKING')
        );
      }
      if (id) ids.add(id);
    });
  }

  const evidenceIds = new Set((Array.isArray(input.evidence) ? input.evidence : []).map(item => item.id));
  const factIds = new Set((Array.isArray(input.facts) ? input.facts : []).map(item => item.id));
  (Array.isArray(input.facts) ? input.facts : []).forEach((fact, index) => {
    if (!fact.sourceLevel) {
      findings.push(
        missing(`facts[${index}].sourceLevel`, '事實缺少來源層級。', requiredFor, 'TRACEABILITY', 'BLOCKING')
      );
    }
    if (fact.sourceLevel === 'EVIDENCE_BACKED' && !fact.evidenceIds?.length) {
      findings.push(
        missing(`facts[${index}].evidenceIds`, 'EVIDENCE_BACKED 事實缺少證據 ID。', requiredFor, 'TRACEABILITY', 'BLOCKING')
      );
    }
    fact.evidenceIds?.forEach((id, evidenceIndex) => {
      if (!evidenceIds.has(id)) {
        findings.push(
          missing(
            `facts[${index}].evidenceIds[${evidenceIndex}]`,
            '事實引用的證據 ID 無法在輸入 evidence 中回查。',
            requiredFor,
            'TRACEABILITY',
            'BLOCKING'
          )
        );
      }
    });
  });
  const claimIds = new Set<string>();
  (Array.isArray(input.claims) ? input.claims : []).forEach((claim, index) => {
    const id = text(claim.id);
    if (!id || claimIds.has(id)) {
      findings.push(
        missing(
          `claims[${index}].id`,
          id ? 'Claim ID 重複，無法唯一回查。' : 'Claim 缺少可回查 ID。',
          requiredFor,
          'TRACEABILITY',
          'BLOCKING'
        )
      );
    }
    if (!text(claim.statement)) {
      findings.push(
        missing(`claims[${index}].statement`, 'Claim 缺少內容。', requiredFor, 'TRACEABILITY', 'BLOCKING')
      );
    }
    claim.factIds?.forEach((factId, factIndex) => {
      if (!factIds.has(factId)) {
        findings.push(
          missing(
            `claims[${index}].factIds[${factIndex}]`,
            'Claim 引用的 Fact ID 無法回查。',
            requiredFor,
            'TRACEABILITY',
            'BLOCKING'
          )
        );
      }
    });
    claim.evidenceIds?.forEach((evidenceId, evidenceIndex) => {
      if (!evidenceIds.has(evidenceId)) {
        findings.push(
          missing(
            `claims[${index}].evidenceIds[${evidenceIndex}]`,
            'Claim 引用的 Evidence ID 無法回查。',
            requiredFor,
            'TRACEABILITY',
            'BLOCKING'
          )
        );
      }
    });
    if (id) claimIds.add(id);
  });
  return findings;
}

function minimumInputFindings(input: CaseInput): MissingInput[] {
  const findings: MissingInput[] = [];
  const requiredFor = [input.pleadingType || 'unknown'];
  for (const [field, value] of [
    ['caseType', input.caseType],
    ['pleadingType', input.pleadingType],
    ['styleProfile', input.styleProfile]
  ] as const) {
    if (!text(value)) {
      findings.push(
        missing(field, '缺少最低可生成資料。', requiredFor, 'MINIMUM_GENERATION', 'BLOCKING')
      );
    }
  }
  for (const field of ['parties', 'facts', 'claims', 'evidence', 'attachments'] as const) {
    if (!Array.isArray(input[field])) {
      findings.push(
        missing(field, '輸入欄位必須是陣列。', requiredFor, 'MINIMUM_GENERATION', 'BLOCKING')
      );
    }
  }
  return findings;
}

function profileFindings(input: CaseInput, profile: PleadingRuleProfile): MissingInput[] {
  const findings: MissingInput[] = [];
  const requiredFor = [input.pleadingType];
  if (
    profile.verificationStatus !== 'VERIFIED' ||
    profile.caseType !== input.caseType ||
    (profile.pleadingType !== undefined && profile.pleadingType !== input.pleadingType) ||
    (profile.supportedPleadingTypes && !profile.supportedPleadingTypes.includes(input.pleadingType))
  ) {
    findings.push(
      missing('ruleProfile', 'Rule Profile 尚未驗證、核准或不適用本輸入。', requiredFor, 'PROFILE', 'BLOCKING', profile.id)
    );
  }
  if (input.expectedRuleProfileVersion && input.expectedRuleProfileVersion !== profile.version) {
    findings.push(
      missing('expectedRuleProfileVersion', 'Rule Profile 版本不符。', requiredFor, 'PROFILE', 'BLOCKING', profile.id)
    );
  }

  const ids = new Set<string>();
  profile.rules.forEach((rule, index) => {
    if (ids.has(rule.id)) {
      findings.push(
        missing(`rules[${index}].id`, 'Rule ID 重複。', requiredFor, 'PROFILE', 'BLOCKING', rule.id)
      );
    }
    ids.add(rule.id);
  });
  return findings;
}

function requiredFields(targetSection: string, input: CaseInput, value: SectionValue): RequiredField[] | undefined {
  const nonRepresentatives = parties(input).filter(party => !isRepresentative(party));
  const representatives = parties(input).filter(isRepresentative);
  if (targetSection === 'parties' || targetSection === 'complaint_parties') {
    if (!nonRepresentatives.length) return [{ field: 'parties', value: '' }];
    return nonRepresentatives.flatMap((party, index) => [
      { field: `parties[${index}].name`, value: text(party.name) },
      { field: `parties[${index}].address`, value: publicAddress(party) }
    ]);
  }
  if (targetSection === 'representatives') {
    return representatives.flatMap((party, index) => [
      { field: `representatives[${index}].name`, value: text(party.name) },
      { field: `representatives[${index}].address`, value: publicAddress(party) },
      ...(party.role === 'legal_representative'
        ? [{ field: `representatives[${index}].relationshipToParty`, value: text(party.relationshipToParty) }]
        : [])
    ]);
  }
  if (Object.hasOwn(SECTION_TITLES, targetSection)) {
    return [{ field: targetSection, value: value.content }];
  }
  return undefined;
}

function groupRules(rules: ContentRule[]): Map<string, ContentRule[]> {
  const groups = new Map<string, ContentRule[]>();
  for (const rule of rules) {
    if (!rule.targetSection) continue;
    groups.set(rule.targetSection, [...(groups.get(rule.targetSection) || []), rule]);
  }
  return groups;
}

function buildStructure(input: CaseInput, rules: ContentRule[]): PleadingStructure {
  return {
    id: `${input.caseType}.${input.pleadingType}`,
    pleadingType: input.pleadingType,
    sections: [...groupRules(rules)].map(([sectionId, sectionRules]) => ({
      id: sectionId,
      sectionType: sectionId,
      title: SECTION_TITLES[sectionId],
      ruleIds: sectionRules.map(rule => rule.id),
      requirementLevels: [...new Set(sectionRules.map(rule => rule.level))]
    }))
  };
}

function buildSections(structure: PleadingStructure, values: Record<string, SectionValue>): DraftSection[] {
  return structure.sections
    .filter(section => Object.hasOwn(values, section.id) && Object.hasOwn(SECTION_TITLES, section.id))
    .map(section => ({
      ...section,
      content: values[section.id].content,
      sourceClaimIds: values[section.id].sourceClaimIds,
      sourceFactIds: values[section.id].sourceFactIds,
      sourceEvidenceIds: values[section.id].sourceEvidenceIds,
      generated: false
    }));
}

function ruleFindings(
  input: CaseInput,
  rules: ContentRule[],
  values: Record<string, SectionValue>
): MissingInput[] {
  const findings: MissingInput[] = [];
  const requiredFor = [input.pleadingType];
  for (const rule of rules) {
    if (!rule.targetSection || !Object.hasOwn(values, rule.targetSection) || !Object.hasOwn(SECTION_TITLES, rule.targetSection)) {
      findings.push(
        missing(rule.targetSection || rule.id, 'Rule 無法對應到已知書狀區段。', requiredFor, 'PROFILE', 'BLOCKING', rule.id)
      );
      continue;
    }
    if (rule.level === 'UNVERIFIED' || rule.level === 'RECOMMENDED_CANDIDATE') {
      findings.push(
        missing(rule.targetSection, 'Rule 尚未完成驗證或核准。', requiredFor, 'PROFILE', 'BLOCKING', rule.id)
      );
      continue;
    }
    if (rule.level !== 'REQUIRED' && rule.level !== 'RECOMMENDED') {
      findings.push(
        missing(rule.targetSection, 'Rule Requirement Level 未知。', requiredFor, 'PROFILE', 'BLOCKING', rule.id)
      );
      continue;
    }
    if (rule.level !== 'REQUIRED') continue;
    const fields = requiredFields(rule.targetSection, input, values[rule.targetSection]);
    if (!fields) {
      findings.push(
        missing(rule.targetSection, 'Generator 無法解析此 REQUIRED Rule。', requiredFor, 'PROFILE', 'BLOCKING', rule.id)
      );
      continue;
    }
    fields
      .filter(field => !text(field.value))
      .forEach(field =>
        findings.push(
          missing(field.field, '缺少對應案件資料；Generator 未填入未提供內容。', requiredFor, 'LEGAL_COMPLETENESS', 'HIGH', rule.id)
        )
      );
  }
  return findings;
}

export function buildStructuredPleadingDraft(
  input: CaseInput,
  ruleProfile: PleadingRuleProfile = CIVIL_CONTENT_RULE_PROFILE
): StructuredPleadingDraft {
  const values = sectionValues(input);
  const applicableRules = ruleProfile.rules.filter(rule => isApplicable(rule, input));
  const structure = buildStructure(input, applicableRules);
  const sections = buildSections(structure, values);
  const claimsUsed = [...new Set(sections.flatMap(section => section.sourceClaimIds || []))];
  const factsUsed = [...new Set(sections.flatMap(section => section.sourceFactIds || []))];
  const evidenceUsed = [...new Set(sections.flatMap(section => section.sourceEvidenceIds || []))];
  const factsInput = Array.isArray(input.facts) ? input.facts : [];
  const evidenceInput = [
    ...(Array.isArray(input.evidence) ? input.evidence : []),
    ...(Array.isArray(input.attachments) ? input.attachments : [])
  ];
  const missingInputs = [
    ...minimumInputFindings(input),
    ...sourceFindings(input),
    ...profileFindings(input, ruleProfile),
    ...ruleFindings(input, applicableRules, values)
  ];
  const omittedSectionIds = structure.sections
    .filter(section => !sections.some(rendered => rendered.id === section.id))
    .map(section => section.id);

  return {
    id: crypto.randomUUID(),
    caseType: input.caseType,
    pleadingType: input.pleadingType,
    styleProfile: input.styleProfile,
    structure,
    ruleProfileVersion: ruleProfile.version,
    sections,
    claimsUsed,
    claimsUnused: (Array.isArray(input.claims) ? input.claims : [])
      .map(claim => claim.id)
      .filter(id => !claimsUsed.includes(id)),
    factsUsed,
    factsUnused: factsInput.map(fact => fact.id).filter(id => !factsUsed.includes(id)),
    evidenceUsed,
    evidenceUnused: evidenceInput.map(item => item.id).filter(id => !evidenceUsed.includes(id)),
    omittedSectionIds,
    legalReferencesUsed: [],
    missingInputs,
    generationMetadata: {
      generator: 'civilPleadingGenerator',
      caseInputId: input.id,
      ruleProfileId: ruleProfile.id,
      applicableRuleIds: applicableRules.map(rule => rule.id),
      minimumGenerationThresholdMet: !missingInputs.some(
        item => item.category !== 'LEGAL_COMPLETENESS' && item.severity === 'BLOCKING'
      )
    }
  };
}
