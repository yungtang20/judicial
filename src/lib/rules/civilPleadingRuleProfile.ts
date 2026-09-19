import type {
  CaseType,
  CivilPleadingRuleProfile,
  ContentRule,
  FormatProfile,
  LegacyComplianceRule,
  PleadingRuleProfile,
  PleadingType
} from '../../types/compliance';

const CIVIL_PROCEDURE_116 = 'legal_references/civil_procedure_116.md';
const CIVIL_PROCEDURE_117 = 'legal_references/civil_procedure_117.md';
const CIVIL_PROCEDURE_244 = 'legal_references/civil_procedure_244.md';

const CIVIL_PLEADING_TYPES: PleadingType[] = [
  'complaint',
  'answer',
  'preparatory',
  'supplement',
  'motion',
  'report',
  'withdrawal',
  'appeal',
  'interlocutory_appeal',
  'retrial'
];

type RuleDefinition = Omit<ContentRule, 'sourceReferences'> & { sourceReference: string };

function defineRule({ sourceReference, ...rule }: RuleDefinition): ContentRule {
  return { ...rule, sourceReferences: [sourceReference] };
}

function toLegacyRule(rule: ContentRule): LegacyComplianceRule {
  return {
    id: rule.id,
    description: rule.description,
    targetSection: rule.targetSection,
    validatorId: rule.validatorId,
    requirementLevel: rule.level,
    legalBasis: rule.sourceReferences || []
  };
}

const CIVIL_DOCUMENT_FORMAT: Omit<FormatProfile, 'caseType' | 'formatRuleSource'> = {
  formatConfirmed: true,
  paperSize: 'A4',
  writingDirection: 'vertical_horizontal_ltr',
  marginsCm: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
  fontSizePt: { min: 14, max: 20 },
  lineSpacingPt: { mode: 'single_or_fixed', min: 25, max: 30 },
  pageNumbering: true,
  tocThresholdPages: 30,
  doubleSidedPrint: true
};

const JUDICIAL_PAPER_FORMAT: Omit<FormatProfile, 'caseType' | 'formatRuleSource'> = {
  formatConfirmed: true,
  paperSize: 'A4',
  writingDirection: 'vertical_horizontal_ltr',
  marginsCm: null,
  fontSizePt: null,
  lineSpacingPt: null,
  pageNumbering: false,
  tocThresholdPages: null,
  doubleSidedPrint: false
};

export const FORMAT_PROFILES: Readonly<Record<CaseType, FormatProfile>> = {
  civil: {
    caseType: 'civil',
    formatRuleSource: '民事訴訟書狀規則',
    ...CIVIL_DOCUMENT_FORMAT
  },
  civil_enforcement: {
    caseType: 'civil_enforcement',
    formatRuleSource: '民事訴訟書狀規則',
    ...CIVIL_DOCUMENT_FORMAT
  },
  criminal: {
    caseType: 'criminal',
    formatRuleSource: '司法狀紙要點',
    ...JUDICIAL_PAPER_FORMAT
  },
  administrative_litigation: {
    caseType: 'administrative_litigation',
    formatRuleSource: '司法狀紙要點',
    ...JUDICIAL_PAPER_FORMAT
  },
  juvenile: {
    caseType: 'juvenile',
    formatRuleSource: '司法狀紙要點',
    ...JUDICIAL_PAPER_FORMAT
  },
  family: {
    caseType: 'family',
    formatRuleSource: '家事事件書狀規則',
    ...JUDICIAL_PAPER_FORMAT
  },
  non_contentious: {
    caseType: 'non_contentious',
    formatRuleSource: '民事訴訟書狀規則',
    ...CIVIL_DOCUMENT_FORMAT
  }
};

export const CIVIL_PLEADING_RULES: ContentRule[] = [
  defineRule({
    id: 'CIVIL_116_1',
    basis: '民事訴訟法第116條第1項第1款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'parties',
    description: '當事人姓名及住所或居所；法人、其他團體或機關之名稱及公務所、事務所或營業所。'
  }),
  defineRule({
    id: 'CIVIL_116_2',
    basis: '民事訴訟法第116條第1項第2款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'representatives',
    description: '有法定代理人或訴訟代理人時，記載其姓名、住所或居所，以及法定代理人與當事人之關係。'
  }),
  defineRule({
    id: 'CIVIL_116_3',
    basis: '民事訴訟法第116條第1項第3款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'proceeding',
    description: '訴訟事件。'
  }),
  defineRule({
    id: 'CIVIL_116_4',
    basis: '民事訴訟法第116條第1項第4款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'statements',
    description: '應為之聲明或陳述。'
  }),
  defineRule({
    id: 'CIVIL_116_5',
    basis: '民事訴訟法第116條第1項第5款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'evidence',
    description: '供證明或釋明用之證據。'
  }),
  defineRule({
    id: 'CIVIL_116_6',
    basis: '民事訴訟法第116條第1項第6款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'attachments',
    description: '附屬文件及其件數。'
  }),
  defineRule({
    id: 'CIVIL_116_7',
    basis: '民事訴訟法第116條第1項第7款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'court',
    description: '法院。'
  }),
  defineRule({
    id: 'CIVIL_116_8',
    basis: '民事訴訟法第116條第1項第8款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'date',
    description: '年、月、日。'
  }),
  defineRule({
    id: 'CIVIL_116_RECOMMENDED_IDENTIFIERS',
    basis: '民事訴訟法第116條第2項',
    level: 'RECOMMENDED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_116,
    targetSection: 'party_identifiers',
    description: '宜記載當事人、法定代理人或訴訟代理人之性別、出生年月日、職業、國民身分證號碼、營利事業統一編號、電話號碼及其他足資辨別之特徵。'
  }),
  defineRule({
    id: 'CIVIL_117_SIGNATURE',
    basis: '民事訴訟法第117條',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    sourceReference: CIVIL_PROCEDURE_117,
    targetSection: 'signature',
    description: '當事人或代理人應於書狀內簽名或蓋章；以指印代簽名時，應由他人代書姓名、記明事由並簽名。'
  }),
  defineRule({
    id: 'CIVIL_244_1',
    basis: '民事訴訟法第244條第1項第1款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    pleadingTypes: ['complaint'],
    sourceReference: CIVIL_PROCEDURE_244,
    targetSection: 'complaint_parties',
    description: '起訴狀應表明當事人及法定代理人。'
  }),
  defineRule({
    id: 'CIVIL_244_2',
    basis: '民事訴訟法第244條第1項第2款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    pleadingTypes: ['complaint'],
    sourceReference: CIVIL_PROCEDURE_244,
    targetSection: 'subject_and_facts',
    description: '起訴狀應表明訴訟標的及其原因事實。'
  }),
  defineRule({
    id: 'CIVIL_244_3',
    basis: '民事訴訟法第244條第1項第3款',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    pleadingTypes: ['complaint'],
    sourceReference: CIVIL_PROCEDURE_244,
    targetSection: 'judgment_relief',
    description: '起訴狀應表明應受判決事項之聲明。'
  }),
  defineRule({
    id: 'CIVIL_244_RECOMMENDED',
    basis: '民事訴訟法第244條第2項及第3項',
    level: 'RECOMMENDED',
    appliesTo: ['civil'],
    pleadingTypes: ['complaint'],
    sourceReference: CIVIL_PROCEDURE_244,
    targetSection: 'complaint_optional_details',
    description: '起訴狀內宜記載因定法院管轄及其適用程序所必要之事項，以及第二百六十五條所定準備言詞辯論之事項。'
  })
];

export const CIVIL_CONTENT_RULE_PROFILE: PleadingRuleProfile = {
  id: 'CIVIL_PLEADING_RULE_PROFILE',
  version: '2.0.0',
  caseType: 'civil',
  supportedPleadingTypes: CIVIL_PLEADING_TYPES,
  formatProfileId: 'civil',
  sourceAuthority: '全國法規資料庫',
  sourceReference: [CIVIL_PROCEDURE_116, CIVIL_PROCEDURE_117, CIVIL_PROCEDURE_244].join(', '),
  verificationStatus: 'VERIFIED',
  rules: CIVIL_PLEADING_RULES
};

export const CIVIL_PLEADING_RULE_PROFILE: CivilPleadingRuleProfile = {
  id: CIVIL_CONTENT_RULE_PROFILE.id,
  version: CIVIL_CONTENT_RULE_PROFILE.version,
  caseType: 'CIVIL',
  supportedPleadingTypes: CIVIL_CONTENT_RULE_PROFILE.supportedPleadingTypes,
  formatProfileId: CIVIL_CONTENT_RULE_PROFILE.formatProfileId,
  sourceAuthority: CIVIL_CONTENT_RULE_PROFILE.sourceAuthority,
  sourceReference: CIVIL_CONTENT_RULE_PROFILE.sourceReference,
  effectiveDate: CIVIL_CONTENT_RULE_PROFILE.effectiveDate,
  verificationStatus: CIVIL_CONTENT_RULE_PROFILE.verificationStatus,
  rules: CIVIL_CONTENT_RULE_PROFILE.rules.map(toLegacyRule)
};
