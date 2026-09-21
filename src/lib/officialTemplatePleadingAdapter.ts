import type {
  CaseInput,
  PleadingRuleProfile,
  StructuredPleadingDraft
} from '../types/compliance';
import type { OfficialTemplate } from '../types/officialTemplate';
import { buildStructuredPleadingDraft } from './generator/civilPleadingGenerator';
import {
  getOfficialTemplateRuleProfile,
  type OfficialTemplateFieldMapping,
  type OfficialTemplateRuleProfileBinding
} from './rules/officialTemplateRuleProfiles';

export class OfficialTemplateAdapterError extends Error {
  constructor(public readonly code: string, message: string, public readonly fields: string[] = []) {
    super(message);
    this.name = 'OfficialTemplateAdapterError';
  }
}

export type OfficialTemplateAdapterInput = {
  template: OfficialTemplate;
  values: Record<string, string | undefined>;
  profile?: OfficialTemplateRuleProfileBinding;
};

function value(values: OfficialTemplateAdapterInput['values'], key: string): string {
  return typeof values[key] === 'string' ? values[key]!.trim() : '';
}

function resolveProfile(input: OfficialTemplateAdapterInput): OfficialTemplateRuleProfileBinding {
  const profile = input.profile || getOfficialTemplateRuleProfile(input.template.id);
  if (!profile || profile.templateId !== input.template.id) {
    throw new OfficialTemplateAdapterError('RULE_PROFILE_NOT_FOUND', '官方範本沒有對應的 pilot Rule Profile。');
  }
  if (input.template.templateStatus !== 'READY_FOR_MERGE' && input.template.templateStatus !== 'DOWNLOADED') {
    throw new OfficialTemplateAdapterError('TEMPLATE_NOT_READY', '官方範本尚未完成欄位 mapping，禁止接入 Canonical adapter。');
  }
  return profile;
}

function validateMappings(input: OfficialTemplateAdapterInput, profile: OfficialTemplateRuleProfileBinding): void {
  const manifestKeys = new Set(input.template.fields.map(field => field.key));
  const missing = profile.fieldMappings
    .filter(mapping => mapping.required && (!manifestKeys.has(mapping.fieldKey) || !value(input.values, mapping.fieldKey)))
    .map(mapping => mapping.fieldKey);
  if (missing.length) {
    throw new OfficialTemplateAdapterError('REQUIRED_FIELD_MISSING', '官方範本必要欄位缺失；禁止補造。', missing);
  }
  const invalid = profile.fieldMappings
    .filter(mapping => manifestKeys.has(mapping.fieldKey) && !input.template.fields.some(field => field.key === mapping.fieldKey));
  if (invalid.length) {
    throw new OfficialTemplateAdapterError('FIELD_MAPPING_INVALID', '官方範本欄位 mapping 無法回查來源。');
  }
}

function mappingValue(values: OfficialTemplateAdapterInput['values'], mappings: readonly OfficialTemplateFieldMapping[], target: OfficialTemplateFieldMapping['target']): string {
  const mapping = mappings.find(item => item.target === target && value(values, item.fieldKey));
  return mapping ? value(values, mapping.fieldKey) : '';
}

function buildCaseInput(input: OfficialTemplateAdapterInput, profile: OfficialTemplateRuleProfileBinding): CaseInput {
  const mappings = profile.fieldMappings;
  const factsId = `${input.template.id}:defenseFacts`;
  const defenseFacts = mappingValue(input.values, mappings, 'defenseFacts');
  const partyId = `${input.template.id}:defendant`;
  const identifiers = Object.fromEntries(
    (['gender', 'idNumber', 'phone'] as const)
      .map(target => [target, mappingValue(input.values, mappings, target)])
      .filter(([, fieldValue]) => fieldValue)
  );
  const fact = { id: factsId, content: defenseFacts, sourceLevel: 'USER_PROVIDED_FACT' as const };
  return {
    id: `${input.template.id}:case-input`,
    caseType: profile.caseType,
    pleadingType: profile.pleadingType,
    styleProfile: profile.styleProfile,
    parties: [{
      id: partyId,
      role: '被告',
      name: mappingValue(input.values, mappings, 'defendantName'),
      address: mappingValue(input.values, mappings, 'address'),
      identifiers
    }],
    facts: [fact],
    claims: [{
      id: `${input.template.id}:defenseFacts-assertion`,
      statement: defenseFacts,
      factIds: [factsId]
    }],
    evidence: [],
    attachments: [],
    court: mappingValue(input.values, mappings, 'court') || undefined,
    caseNumber: mappingValue(input.values, mappings, 'caseNumber'),
    documentDate: mappingValue(input.values, mappings, 'documentDate'),
    signature: mappingValue(input.values, mappings, 'signature'),
    expectedRuleProfileVersion: profile.ruleProfile.version,
    legalReferencesUsed: profile.legalReferences.map(reference => reference.sourceReference)
  };
}

function buildDraft(caseInput: CaseInput, profile: OfficialTemplateRuleProfileBinding): StructuredPleadingDraft {
  const draft = buildStructuredPleadingDraft(caseInput, profile.ruleProfile);
  const sourceAssertion = caseInput.claims[0];
  const factSection = draft.sections.find(section => section.id === 'subject_and_facts');
  if (sourceAssertion && factSection && !factSection.sourceClaimIds?.includes(sourceAssertion.id)) {
    factSection.sourceClaimIds = [sourceAssertion.id];
    draft.claimsUsed = [sourceAssertion.id];
    draft.claimsUnused = [];
  }
  return {
    ...draft,
    // The template mapping carries legal references in CaseInput/pipeline
    // evidence; the rendered draft contains no citation text to verify.
    legalReferencesUsed: [],
    generationMetadata: {
      ...draft.generationMetadata,
      adapter: 'officialTemplatePleadingAdapter',
      templateId: profile.templateId,
      fieldSource: 'OFFICIAL_TEMPLATE_MANIFEST_VALUES_ONLY',
      aiFabrication: false,
      fieldMappings: profile.fieldMappings,
      mappingVersion: profile.mappingVersion
    }
  };
}

export function adaptOfficialTemplateToCanonical(input: OfficialTemplateAdapterInput): {
  caseInput: CaseInput;
  draft: StructuredPleadingDraft;
  ruleProfile: PleadingRuleProfile;
} {
  const profile = resolveProfile(input);
  validateMappings(input, profile);
  const caseInput = buildCaseInput(input, profile);
  return { caseInput, draft: buildDraft(caseInput, profile), ruleProfile: profile.ruleProfile };
}

export function adaptOfficialTemplateToCaseInput(input: OfficialTemplateAdapterInput): CaseInput {
  return adaptOfficialTemplateToCanonical(input).caseInput;
}

export function adaptOfficialTemplateToStructuredDraft(input: OfficialTemplateAdapterInput): StructuredPleadingDraft {
  return adaptOfficialTemplateToCanonical(input).draft;
}
