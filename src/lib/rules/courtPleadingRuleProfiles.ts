import type {
  CaseType,
  FormatProfile,
  LegalReference,
  PleadingRuleProfile,
  PleadingType,
  StyleProfile
} from '../../types/compliance';
import { CIVIL_CONTENT_RULE_PROFILE, FORMAT_PROFILES } from './civilPleadingRuleProfile';
import {
  ADMINISTRATIVE_APPEAL_RULE_PROFILE,
  CIVIL_ANSWER_RULE_PROFILE,
  CIVIL_ENFORCEMENT_APPLICATION_RULE_PROFILE,
  CIVIL_INTERLOCUTORY_APPEAL_RULE_PROFILE,
  CIVIL_PAYMENT_ORDER_RULE_PROFILE,
  CIVIL_RETRIAL_RULE_PROFILE,
  CIVIL_SECOND_APPEAL_RULE_PROFILE,
  CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE,
  CIVIL_THIRD_APPEAL_STATUTORY_RULE_PROFILE,
  CRIMINAL_SECOND_APPEAL_RULE_PROFILE,
  CRIMINAL_THIRD_APPEAL_RULE_PROFILE,
  NON_CONTENTIOUS_APPLICATION_RULE_PROFILE,
  PROCEDURAL_LEGAL_REFERENCES
} from './proceduralPleadingRuleProfiles';

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
  sectionFieldMap?: Readonly<Record<string, readonly string[]>>;
  appealLevel?: 'SECOND' | 'THIRD';
  appealGroundType?: 'STATUTORY' | 'PRINCIPLED_IMPORTANCE';
  requiresFixedQuantityClaim?: boolean;
}

function proceduralConfig(
  categoryKey: string,
  documentTitle: string,
  caseType: CaseType,
  pleadingType: PleadingType,
  styleProfile: StyleProfile,
  ruleProfile: PleadingRuleProfile,
  legalReferences: LegalReference[],
  sectionFieldMap: CategoryPleadingConfig['sectionFieldMap'],
  options: Partial<Pick<CategoryPleadingConfig,
    'appealLevel' | 'appealGroundType' | 'claimantRole' | 'respondentRole' | 'claimLabel' | 'factsLabel'
  >> = {}
): CategoryPleadingConfig {
  return {
    categoryKey,
    documentTitle,
    caseType,
    pleadingType,
    styleProfile,
    claimantRole: '聲請人',
    respondentRole: '相對人',
    proceeding: '',
    claimLabel: '聲明',
    factsLabel: '事實及理由',
    ruleProfile,
    legalReferences: [...legalReferences],
    formatProfile: FORMAT_PROFILES[caseType],
    sectionFieldMap,
    ...options
  };
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
        ruleProfile: CIVIL_PAYMENT_ORDER_RULE_PROFILE,
        legalReferences: PAYMENT_ORDER_LEGAL_REFERENCES,
        formatProfile: FORMAT_PROFILES.civil,
        requiresFixedQuantityClaim: true
      };
    case 'CIVIL_ANSWER':
      return proceduralConfig(normalized, '民事答辯狀', 'civil', 'answer', 'litigation_brief', CIVIL_ANSWER_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_ANSWER, {
        answer_facts_and_reasons: ['answerFactsAndReasons', 'clientInput'],
        opponent_position: ['opponentPosition'],
        documentary_evidence_copies: ['documentaryEvidenceCopies'],
        direct_notice: ['directNotice']
      }, { claimantRole: '被告', respondentRole: '原告', claimLabel: '答辯聲明', factsLabel: '答辯之事實及理由' });
    case 'CIVIL_APPEAL_SECOND':
      return proceduralConfig(normalized, '民事第二審上訴狀', 'civil', 'appeal', 'appeal_brief', CIVIL_SECOND_APPEAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_SECOND_APPEAL, {
        first_instance_judgment_and_appeal_statement: ['challengedJudgment', 'judgmentSummary'],
        appeal_disposition: ['appealDisposition', 'claims'],
        appeal_reasons: ['appealReasons'],
        appeal_supporting_facts_and_evidence: ['appealSupportingFactsAndEvidence']
      }, { appealLevel: 'SECOND', claimantRole: '上訴人', respondentRole: '被上訴人' });
    case 'CIVIL_APPEAL_THIRD_STATUTORY':
      return proceduralConfig(normalized, '民事第三審上訴狀', 'civil', 'appeal', 'appeal_brief', CIVIL_THIRD_APPEAL_STATUTORY_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_THIRD_APPEAL_STATUTORY, {
        violated_law: ['violatedLaw'],
        record_facts: ['recordFacts'],
        appellate_interest: ['appellateInterest']
      }, { appealLevel: 'THIRD', appealGroundType: 'STATUTORY', claimantRole: '上訴人', respondentRole: '被上訴人' });
    case 'CIVIL_APPEAL_THIRD_PRINCIPLED':
      return proceduralConfig(normalized, '民事第三審上訴狀（許可上訴）', 'civil', 'appeal', 'appeal_brief', CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_THIRD_APPEAL_PRINCIPLED, {
        violated_law: ['violatedLaw'],
        record_facts: ['recordFacts'],
        principled_importance_reason: ['principledImportanceReason'],
        appellate_interest: ['appellateInterest']
      }, { appealLevel: 'THIRD', appealGroundType: 'PRINCIPLED_IMPORTANCE', claimantRole: '上訴人', respondentRole: '被上訴人' });
    case 'CIVIL_INTERLOCUTORY_APPEAL':
      return proceduralConfig(normalized, '民事抗告狀', 'civil', 'interlocutory_appeal', 'appeal_brief', CIVIL_INTERLOCUTORY_APPEAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_INTERLOCUTORY_APPEAL, {
        interlocutory_appeal_reasons: ['interlocutoryAppealReasons']
      }, { claimantRole: '抗告人', respondentRole: '相對人' });
    case 'CIVIL_RETRIAL':
      return proceduralConfig(normalized, '民事再審之訴狀', 'civil', 'retrial', 'appeal_brief', CIVIL_RETRIAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_RETRIAL, {
        challenged_judgment_and_retrial_statement: ['challengedJudgmentAndRetrialStatement'],
        retrial_disposition: ['retrialDisposition'],
        retrial_reasons_and_time_limit_evidence: ['retrialReasonsAndTimeLimitEvidence'],
        hearing_preparation: ['hearingPreparation'],
        final_judgment_copy: ['finalJudgmentCopy']
      }, { claimantRole: '再審原告', respondentRole: '再審被告' });
    case 'CRIMINAL_APPEAL_SECOND':
      return proceduralConfig(normalized, '刑事第二審上訴書狀', 'criminal', 'appeal', 'appeal_brief', CRIMINAL_SECOND_APPEAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CRIMINAL_SECOND_APPEAL, {
        copies: ['copies'],
        appeal_reasons: ['appealReasons']
      }, { appealLevel: 'SECOND' });
    case 'CRIMINAL_APPEAL_THIRD':
      return proceduralConfig(normalized, '刑事第三審上訴書狀', 'criminal', 'appeal', 'appeal_brief', CRIMINAL_THIRD_APPEAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CRIMINAL_THIRD_APPEAL, {
        copies: ['copies'],
        appeal_reasons: ['appealReasons']
      }, { appealLevel: 'THIRD' });
    case 'ADMINISTRATIVE_APPEAL':
      return proceduralConfig(normalized, '行政訴訟上訴狀', 'administrative_litigation', 'appeal', 'appeal_brief', ADMINISTRATIVE_APPEAL_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.ADMINISTRATIVE_APPEAL, {
        answer_facts_and_reasons: ['factsAndLaw'],
        first_instance_judgment_and_appeal_statement: ['challengedJudgment', 'judgmentSummary'],
        appeal_disposition: ['appealDisposition', 'claims'],
        appeal_reasons: ['appealReasons'],
        violated_law: ['violatedLaw'],
        record_facts: ['recordFacts'],
        necessary_evidence: ['necessaryEvidence']
      }, { claimantRole: '上訴人', respondentRole: '被上訴人' });
    case 'NON_CONTENTIOUS_APPLICATION':
      return proceduralConfig(normalized, '非訟事件聲請狀', 'non_contentious', 'motion', 'formal_motion', NON_CONTENTIOUS_APPLICATION_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.NON_CONTENTIOUS_APPLICATION, {
        request_and_facts: ['requestAndFacts']
      }, { claimantRole: '聲請人', respondentRole: '相對人' });
    case 'CIVIL_ENFORCEMENT_APPLICATION':
      return proceduralConfig(normalized, '民事強制執行聲請狀', 'civil_enforcement', 'motion', 'formal_motion', CIVIL_ENFORCEMENT_APPLICATION_RULE_PROFILE, PROCEDURAL_LEGAL_REFERENCES.CIVIL_ENFORCEMENT_APPLICATION, {
        right_to_be_realized: ['rightToBeRealized'],
        enforcement_target: ['enforcementTarget'],
        requested_enforcement_action: ['requestedEnforcementAction'],
        enforcement_title_documents: ['enforcementTitleDocuments']
      }, { claimantRole: '債權人', respondentRole: '債務人' });
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
