import type {
  CaseType,
  ContentRule,
  FormatProfile,
  LegalReference,
  PleadingRuleProfile,
  PleadingType,
  StyleProfile
} from '../../types/compliance';
import { CIVIL_CONTENT_RULE_PROFILE, FORMAT_PROFILES } from './civilPleadingRuleProfile';

export const CIVIL_PROCEDURE_116 = 'legal_references/civil_procedure_116.md';
export const CIVIL_PROCEDURE_117 = 'legal_references/civil_procedure_117.md';
export const CIVIL_PROCEDURE_244 = 'legal_references/civil_procedure_244.md';
export const CIVIL_PROCEDURE_508 = 'legal_references/civil_procedure_508.md';
export const CRIMINAL_PROCEDURE_242 = 'legal_references/criminal_procedure_242.md';
export const FAMILY_VIOLENCE_10 = 'legal_references/family_violence_10.md';

export const CIVIL_LEGAL_REFERENCES: LegalReference[] = [
  { sourceReference: CIVIL_PROCEDURE_116, verificationStatus: 'VERIFIED', contentHash: '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46' },
  { sourceReference: CIVIL_PROCEDURE_117, verificationStatus: 'VERIFIED', contentHash: '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d' },
  { sourceReference: CIVIL_PROCEDURE_244, verificationStatus: 'VERIFIED', contentHash: 'ff32248360cbe6db8297292014abb0e377dcc520e5822b42c24649dc71ca03b6' }
];

export const PAYMENT_ORDER_LEGAL_REFERENCES: LegalReference[] = [
  { sourceReference: CIVIL_PROCEDURE_116, verificationStatus: 'VERIFIED', contentHash: '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46' },
  { sourceReference: CIVIL_PROCEDURE_117, verificationStatus: 'VERIFIED', contentHash: '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d' },
  { sourceReference: CIVIL_PROCEDURE_508, verificationStatus: 'VERIFIED', contentHash: '571ffac7a2226079178a3ffc72953c6467ff3182937c3b823c6e9a983775e63c' }
];

export const CRIMINAL_LEGAL_REFERENCES: LegalReference[] = [
  { sourceReference: CRIMINAL_PROCEDURE_242, verificationStatus: 'VERIFIED', contentHash: 'e4cc0af9ee68cccd1274ed35cfc702d1522d7ea39bbfa486981fa755d0b47ec2' }
];

export const FAMILY_LEGAL_REFERENCES: LegalReference[] = [
  { sourceReference: FAMILY_VIOLENCE_10, verificationStatus: 'VERIFIED', contentHash: 'dca46dfdc037fca2f9386554507a96f9eb83a7f2af948d9f77998a753c53deff' }
];

// --- 支付命令規則設定檔 ---
const PAYMENT_ORDER_RULES: ContentRule[] = [
  ...CIVIL_CONTENT_RULE_PROFILE.rules.filter(r => !r.id.startsWith('CIVIL_244')),
  {
    id: 'CIVIL_508_1',
    basis: '民事訴訟法第508條第1項',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    pleadingTypes: ['motion'],
    sourceReferences: [CIVIL_PROCEDURE_508],
    targetSection: 'statements',
    description: '債權人之請求，以給付金錢或其他代替物或有價證券之一定數量為標的者，得聲請法院發支付命令。'
  },
  {
    id: 'CIVIL_508_FACTS',
    basis: '民事訴訟法第508條第1項',
    level: 'REQUIRED',
    appliesTo: ['civil'],
    pleadingTypes: ['motion'],
    sourceReferences: [CIVIL_PROCEDURE_508],
    targetSection: 'subject_and_facts',
    description: '請求之原因事實。'
  }
];

export const PAYMENT_ORDER_RULE_PROFILE: PleadingRuleProfile = {
  id: 'PAYMENT_ORDER_RULE_PROFILE',
  version: '2.0.0',
  caseType: 'civil',
  pleadingType: 'motion',
  supportedPleadingTypes: ['motion', 'complaint'],
  formatProfileId: 'civil',
  sourceAuthority: '全國法規資料庫',
  sourceReference: [CIVIL_PROCEDURE_116, CIVIL_PROCEDURE_117, CIVIL_PROCEDURE_508].join(', '),
  verificationStatus: 'VERIFIED',
  rules: PAYMENT_ORDER_RULES
};

// --- 刑事告訴規則設定檔 ---
const CRIMINAL_RULES: ContentRule[] = [
  {
    id: 'CRIMINAL_242_PARTIES',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'parties',
    description: '告訴狀應載明告訴人及被告姓名、住所居所。'
  },
  {
    id: 'CRIMINAL_242_STATEMENTS',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'statements',
    description: '告訴狀應載明告訴意旨與告訴人之陳述。'
  },
  {
    id: 'CRIMINAL_242_FACTS',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'subject_and_facts',
    description: '犯罪事實及告訴理由。'
  },
  {
    id: 'CRIMINAL_242_EVIDENCE',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'evidence',
    description: '供調查之證據方法。'
  },
  {
    id: 'CRIMINAL_242_COURT',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'court',
    description: '告訴狀應載明向管轄之地方檢察署或法院提出。'
  },
  {
    id: 'CRIMINAL_242_DATE',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'date',
    description: '年、月、日。'
  },
  {
    id: 'CRIMINAL_242_SIGNATURE',
    basis: '刑事訴訟法第242條第1項',
    level: 'REQUIRED',
    appliesTo: ['criminal'],
    pleadingTypes: ['complaint'],
    sourceReferences: [CRIMINAL_PROCEDURE_242],
    targetSection: 'signature',
    description: '具狀人簽名或蓋章。'
  }
];

export const CRIMINAL_CONTENT_RULE_PROFILE: PleadingRuleProfile = {
  id: 'CRIMINAL_PLEADING_RULE_PROFILE',
  version: '2.0.0',
  caseType: 'criminal',
  pleadingType: 'complaint',
  supportedPleadingTypes: ['complaint', 'motion'],
  formatProfileId: 'criminal',
  sourceAuthority: '全國法規資料庫',
  sourceReference: CRIMINAL_PROCEDURE_242,
  verificationStatus: 'VERIFIED',
  rules: CRIMINAL_RULES
};

// --- 家暴保護令規則設定檔 ---
const FAMILY_PROTECTION_RULES: ContentRule[] = [
  {
    id: 'FAMILY_VIOLENCE_10_PARTIES',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'parties',
    description: '保護令聲請狀應載明聲請人及相對人之資料。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_STATEMENTS',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'statements',
    description: '聲請核發保護令之意旨及具體聲請內容。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_FACTS',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'subject_and_facts',
    description: '家庭暴力之具體事實及聲請原因。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_EVIDENCE',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'evidence',
    description: '證明家庭暴力情事之證據資料。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_COURT',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'court',
    description: '管轄法院。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_DATE',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'date',
    description: '年、月、日。'
  },
  {
    id: 'FAMILY_VIOLENCE_10_SIGNATURE',
    basis: '家庭暴力防治法第10條第1項',
    level: 'REQUIRED',
    appliesTo: ['family'],
    pleadingTypes: ['motion'],
    sourceReferences: [FAMILY_VIOLENCE_10],
    targetSection: 'signature',
    description: '具狀人簽名或蓋章。'
  }
];

export const FAMILY_PROTECTION_RULE_PROFILE: PleadingRuleProfile = {
  id: 'FAMILY_PROTECTION_RULE_PROFILE',
  version: '2.0.0',
  caseType: 'family',
  pleadingType: 'motion',
  supportedPleadingTypes: ['motion', 'complaint'],
  formatProfileId: 'family',
  sourceAuthority: '全國法規資料庫',
  sourceReference: FAMILY_VIOLENCE_10,
  verificationStatus: 'VERIFIED',
  rules: FAMILY_PROTECTION_RULES
};

export interface CategoryPleadingConfig {
  categoryKey: string;
  documentTitle: string;
  caseType: CaseType;
  pleadingType: PleadingType;
  styleProfile: StyleProfile;
  claimantRole: string;
  respondentRole: string;
  proceeding: string;
  claimLabel: string;
  factsLabel: string;
  ruleProfile: PleadingRuleProfile;
  legalReferences: LegalReference[];
  formatProfile: FormatProfile;
}

export function getCourtPleadingConfig(categoryKey: string): CategoryPleadingConfig | null {
  const normalized = categoryKey.trim().toUpperCase();

  switch (normalized) {
    // 1. 民事起訴類
    case 'JUDICIAL_CIVIL_TEMPLATE':
    case 'CIVIL_COMPLAINT_GENERAL':
    case 'CIVIL_TORT_GENERAL':
    case 'UNIVERSAL_AI_PLEADING':
      return {
        categoryKey: normalized,
        documentTitle: '民事起訴狀',
        caseType: 'civil',
        pleadingType: 'complaint',
        styleProfile: 'civil_complaint',
        claimantRole: '原告',
        respondentRole: '被告',
        proceeding: '損害賠償等事件',
        claimLabel: '訴之聲明',
        factsLabel: '事實及理由',
        ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
        legalReferences: CIVIL_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.civil
      };

    // 2. 支付命令聲請類
    case 'PAYMENT_ORDER_PETITION':
      return {
        categoryKey: normalized,
        documentTitle: '民事支付命令聲請狀',
        caseType: 'civil',
        pleadingType: 'motion',
        styleProfile: 'formal_motion',
        claimantRole: '聲請人（債權人）',
        respondentRole: '相對人（債務人）',
        proceeding: '督促程序聲請發支付命令事件',
        claimLabel: '請求標的及應發支付命令之意旨',
        factsLabel: '請求之原因事實',
        ruleProfile: PAYMENT_ORDER_RULE_PROFILE,
        legalReferences: PAYMENT_ORDER_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.civil
      };

    // 3. 刑事告訴類
    case 'JUDICIAL_CRIMINAL_TEMPLATE':
    case 'CRIMINAL_COMPLAINT':
    case 'CRIMINAL_COMPLAINT_TRAFFIC':
    case 'CRIMINAL_COMPLAINT_FRAUD':
    case 'CRIMINAL_COMPLAINT_DEFAMATION':
    case 'CRIMINAL_COMPLAINT_THEFT':
    case 'CRIMINAL_COMPLAINT_ASSAULT':
    case 'CRIMINAL_COMPLAINT_INTIMIDATION':
    case 'CRIMINAL_COMPLAINT_PRIVACY':
      return {
        categoryKey: normalized,
        documentTitle: normalized === 'CRIMINAL_COMPLAINT_TRAFFIC' ? '刑事告訴狀（車禍過失傷害）' : '刑事告訴狀',
        caseType: 'criminal',
        pleadingType: 'complaint',
        styleProfile: 'criminal_complaint',
        claimantRole: '告訴人',
        respondentRole: '被告',
        proceeding: normalized === 'CRIMINAL_COMPLAINT_TRAFFIC' ? '過失傷害案件' : '刑事告訴案件',
        claimLabel: '告訴意旨',
        factsLabel: '犯罪事實及理由',
        ruleProfile: CRIMINAL_CONTENT_RULE_PROFILE,
        legalReferences: CRIMINAL_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.criminal
      };

    // 4. 家事保護令類
    case 'JUDICIAL_FAMILY_TEMPLATE':
    case 'DOMESTIC_VIOLENCE_PROTECTION_ORDER':
      return {
        categoryKey: normalized,
        documentTitle: '民事通常/暫時保護令聲請狀',
        caseType: 'family',
        pleadingType: 'motion',
        styleProfile: 'family_protective',
        claimantRole: '聲請人（被害人）',
        respondentRole: '相對人（加害人）',
        proceeding: '聲請通常保護令事件',
        claimLabel: '聲請核發保護令之意旨及聲明',
        factsLabel: '家庭暴力之具體事實及理由',
        ruleProfile: FAMILY_PROTECTION_RULE_PROFILE,
        legalReferences: FAMILY_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.family
      };

    // 尚未支援之類別
    default:
      return null;
  }
}
