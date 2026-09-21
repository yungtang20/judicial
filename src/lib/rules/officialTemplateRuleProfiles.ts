import type {
  CaseType,
  ContentRule,
  FormatProfile,
  LegalReference,
  PleadingRuleProfile,
  PleadingType,
  StyleProfile
} from '../../types/compliance';
import { FORMAT_PROFILES } from './civilPleadingRuleProfile';

const TEMPLATE_ID = 'judicial-0202-1';
const TEMPLATE_SOURCE = 'data/official-templates/files/judicial-0202-1.odt';
const CRIMINAL_PROCEDURE_53 = 'legal_references/criminal_procedure_53.md';

export type OfficialTemplateFieldTarget =
  | 'caseNumber'
  | 'defendantName'
  | 'gender'
  | 'address'
  | 'idNumber'
  | 'phone'
  | 'defenseFacts'
  | 'court'
  | 'documentDate'
  | 'signature';

export interface OfficialTemplateFieldMapping {
  fieldKey: string;
  target: OfficialTemplateFieldTarget;
  required: boolean;
}

export interface OfficialTemplateRuleProfileBinding {
  templateId: string;
  caseType: CaseType;
  pleadingType: PleadingType;
  styleProfile: StyleProfile;
  ruleProfile: PleadingRuleProfile;
  legalReferences: LegalReference[];
  formatProfile: FormatProfile;
  mappingVersion: string;
  fieldMappings: readonly OfficialTemplateFieldMapping[];
}

const rule = (
  id: string,
  targetSection: string,
  description: string,
  level: ContentRule['level'] = 'REQUIRED'
): ContentRule => ({
  id,
  basis: '官方範本欄位映射契約（不得由 AI 補造）',
  targetSection,
  description,
  level,
  appliesTo: ['criminal'],
  pleadingTypes: ['answer'],
  sourceReferences: [TEMPLATE_SOURCE]
});

const CRIMINAL_ANSWER_RULE_PROFILE: PleadingRuleProfile = {
  id: 'OFFICIAL_CRIMINAL_ANSWER_PILOT_RULE_PROFILE',
  version: '1.0.0',
  caseType: 'criminal',
  pleadingType: 'answer',
  supportedPleadingTypes: ['answer'],
  formatProfileId: 'criminal',
  sourceAuthority: '司法院官方範本欄位契約；刑事訴訟法第53條',
  sourceReference: `${TEMPLATE_SOURCE}, ${CRIMINAL_PROCEDURE_53}`,
  verificationStatus: 'VERIFIED',
  rules: [
    rule('OFFICIAL_0202_PARTIES', 'parties', '被告姓名及可公開之住所或送達處所。'),
    rule('OFFICIAL_0202_DEFENSE_FACTS', 'subject_and_facts', '答辯要旨原文。'),
    rule('OFFICIAL_0202_DATE', 'date', '文書日期由欄位提供。'),
    rule('OFFICIAL_0202_SIGNATURE', 'signature', '簽名或蓋章由欄位提供。')
  ]
};

export const OFFICIAL_TEMPLATE_RULE_PROFILES: Readonly<Record<string, OfficialTemplateRuleProfileBinding>> = {
  [TEMPLATE_ID]: {
    templateId: TEMPLATE_ID,
    caseType: 'criminal',
    pleadingType: 'answer',
    styleProfile: 'simple_procedural',
    ruleProfile: CRIMINAL_ANSWER_RULE_PROFILE,
    legalReferences: [
      {
        sourceReference: TEMPLATE_SOURCE,
        contentHash: 'c7978050ee139dc1df6e3ffac932ee393d8f48e9fc4ac9163885678f670e2d5e',
        verificationStatus: 'VERIFIED'
      },
      {
        sourceReference: CRIMINAL_PROCEDURE_53,
        contentHash: '81fb3f20efa744a639e3a3dc49e3f06ee237db061ddd7f7fbc8e1c8ef86274be95',
        verificationStatus: 'VERIFIED'
      }
    ],
    formatProfile: FORMAT_PROFILES.criminal,
    mappingVersion: '1.0.0',
    fieldMappings: [
      { fieldKey: 'caseNumber', target: 'caseNumber', required: true },
      { fieldKey: 'defendantName', target: 'defendantName', required: true },
      { fieldKey: 'gender', target: 'gender', required: true },
      { fieldKey: 'registeredAddress', target: 'address', required: false },
      { fieldKey: 'currentAddress', target: 'address', required: false },
      { fieldKey: 'idNumber', target: 'idNumber', required: false },
      { fieldKey: 'phone', target: 'phone', required: false },
      { fieldKey: 'defenseFacts', target: 'defenseFacts', required: true },
      { fieldKey: 'court', target: 'court', required: false },
      { fieldKey: 'documentDate', target: 'documentDate', required: true },
      { fieldKey: 'signature', target: 'signature', required: true }
    ]
  }
};

export function getOfficialTemplateRuleProfile(templateId: string): OfficialTemplateRuleProfileBinding | null {
  return OFFICIAL_TEMPLATE_RULE_PROFILES[templateId.trim()] || null;
}
