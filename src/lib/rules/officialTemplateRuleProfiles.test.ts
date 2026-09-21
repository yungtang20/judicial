import { describe, expect, it } from 'vitest';
import { FORMAT_PROFILES } from './civilPleadingRuleProfile';
import { getOfficialTemplateRuleProfile, OFFICIAL_TEMPLATE_RULE_PROFILES } from './officialTemplateRuleProfiles';

describe('officialTemplateRuleProfiles', () => {
  it('defines the pilot profile with explicit canonical mappings', () => {
    const profile = getOfficialTemplateRuleProfile('judicial-0202-1');
    expect(profile).not.toBeNull();
    expect(profile?.caseType).toBe('criminal');
    expect(profile?.pleadingType).toBe('answer');
    expect(profile?.formatProfile).toEqual(FORMAT_PROFILES.criminal);
    expect(profile?.legalReferences.every(reference => reference.verificationStatus === 'VERIFIED')).toBe(true);
    expect(profile?.fieldMappings.find(mapping => mapping.fieldKey === 'defenseFacts')?.target).toBe('defenseFacts');
  });

  it('does not provide an implicit profile for unknown templates', () => {
    expect(getOfficialTemplateRuleProfile('unknown-template')).toBeNull();
    expect(Object.keys(OFFICIAL_TEMPLATE_RULE_PROFILES)).toEqual(['judicial-0202-1']);
  });
});

