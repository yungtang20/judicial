import type {
  CaseType,
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
export const CRIMINAL_PROCEDURE_487 = 'legal_references/criminal_procedure_487.md';
export const CRIMINAL_PROCEDURE_492 = 'legal_references/criminal_procedure_492.md';
export const SEXUAL_ASSAULT_PREVENTION_15 = 'legal_references/sexual_assault_prevention_15.md';

const verified = (sourceReference: string, contentHash: string): LegalReference => ({
  sourceReference,
  verificationStatus: 'VERIFIED',
  contentHash
});

export const CIVIL_LEGAL_REFERENCES: LegalReference[] = [
  verified(CIVIL_PROCEDURE_116, '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46'),
  verified(CIVIL_PROCEDURE_117, '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d'),
  verified(CIVIL_PROCEDURE_244, 'ff32248360cbe6db8297292014abb0e377dcc520e5822b42c24649dc71ca03b6')
];

export const PAYMENT_ORDER_LEGAL_REFERENCES: LegalReference[] = [
  ...CIVIL_LEGAL_REFERENCES.filter(reference => reference.sourceReference !== CIVIL_PROCEDURE_244),
  verified(CIVIL_PROCEDURE_508, 'db4f0f7c651a440e4d9db0dd514bef3f210297623c90a1c8bf5e33af90741af7')
];

export const CRIMINAL_SUPPLEMENTARY_CIVIL_LEGAL_REFERENCES: LegalReference[] = [
  ...CIVIL_LEGAL_REFERENCES,
  verified(CRIMINAL_PROCEDURE_487, '0b3823ee6d9b4167493e93c65e57d3680454387357d3c018c20fe21edae646a7'),
  verified(CRIMINAL_PROCEDURE_492, 'dda2400a3054c63122e9ba58722de99560068a616b4b81dd9b687a8a5d908129')
];

/** §492 is the approved bridge to the already-approved civil §§116/117/244 rules. */
export const CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE: PleadingRuleProfile = {
  ...CIVIL_CONTENT_RULE_PROFILE,
  id: 'CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE',
  version: '3.0.0',
  pleadingType: 'complaint',
  supportedPleadingTypes: ['complaint'],
  sourceReference: [
    CIVIL_PROCEDURE_116,
    CIVIL_PROCEDURE_117,
    CIVIL_PROCEDURE_244,
    CRIMINAL_PROCEDURE_492
  ].join(', '),
  rules: CIVIL_CONTENT_RULE_PROFILE.rules.map(rule => ({
    ...rule,
    id: `SUPPLEMENTARY_${rule.id}`,
    basis: `刑事訴訟法第492條準用${rule.basis}`,
    sourceReferences: [...(rule.sourceReferences || []), CRIMINAL_PROCEDURE_492]
  }))
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
  requiresFixedQuantityClaim?: boolean;
}

function civilComplaintConfig(
  categoryKey: string,
  documentTitle = '民事起訴狀',
  proceeding = '民事事件'
): CategoryPleadingConfig {
  return {
    categoryKey,
    documentTitle,
    caseType: 'civil',
    pleadingType: 'complaint',
    styleProfile: 'civil_complaint',
    claimantRole: '原告',
    respondentRole: '被告',
    proceeding,
    claimLabel: '訴之聲明',
    factsLabel: '事實及理由',
    ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
    legalReferences: CIVIL_LEGAL_REFERENCES,
    formatProfile: FORMAT_PROFILES.civil
  };
}

export function getCourtPleadingConfig(categoryKey: string): CategoryPleadingConfig | null {
  const normalized = categoryKey.trim().toUpperCase();

  switch (normalized) {
    case 'CIVIL_COMPLAINT_GENERAL':
    case 'CIVIL_TORT_GENERAL':
      return civilComplaintConfig(normalized);
    case 'SPOUSAL_RIGHT_INFRINGEMENT':
      return civilComplaintConfig(normalized, '民事起訴狀（侵害配偶權損害賠償）', '損害賠償事件（侵害配偶權）');
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
        ruleProfile: CIVIL_CONTENT_RULE_PROFILE,
        legalReferences: PAYMENT_ORDER_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.civil,
        requiresFixedQuantityClaim: true
      };
    case 'CRIMINAL_SUPPLEMENTARY_CIVIL':
      return {
        categoryKey: normalized,
        documentTitle: '刑事附帶民事訴訟起訴狀',
        caseType: 'civil',
        pleadingType: 'complaint',
        styleProfile: 'civil_complaint',
        claimantRole: '原告（刑事被害人）',
        respondentRole: '被告（刑事被告）',
        proceeding: '刑事附帶民事訴訟事件',
        claimLabel: '訴之聲明',
        factsLabel: '原因事實及理由',
        ruleProfile: CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE,
        legalReferences: CRIMINAL_SUPPLEMENTARY_CIVIL_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.civil
      };
    default:
      return null;
  }
}
