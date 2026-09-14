import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILY_FORMAT_PROFILES, FORMAT_PROFILES } from './civilPleadingRuleProfile';
import {
  CIVIL_ANSWER_RULE_PROFILE,
  CIVIL_RETRIAL_RULE_PROFILE,
  CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE,
  CRIMINAL_SECOND_APPEAL_RULE_PROFILE,
  CRIMINAL_THIRD_APPEAL_RULE_PROFILE,
  PROCEDURAL_LEGAL_REFERENCES
} from './proceduralPleadingRuleProfiles';

describe('approved procedural pleading rule profiles', () => {
  it('keeps every approved profile exact and pleading-specific', () => {
    expect(CIVIL_ANSWER_RULE_PROFILE).toMatchObject({
      caseType: 'civil', pleadingType: 'answer', supportedPleadingTypes: ['answer'], verificationStatus: 'VERIFIED'
    });
    expect(CRIMINAL_SECOND_APPEAL_RULE_PROFILE).toMatchObject({
      caseType: 'criminal', pleadingType: 'appeal', verificationStatus: 'VERIFIED'
    });
    expect(CRIMINAL_THIRD_APPEAL_RULE_PROFILE.rules.find(rule => rule.id === 'CRIMINAL_382_REASONS')).toMatchObject({
      level: 'REQUIRED', targetSection: 'appeal_reasons'
    });
  });

  it('keeps Civil Procedure Article 501 paragraph 2 recommended', () => {
    const rules = CIVIL_RETRIAL_RULE_PROFILE.rules.filter(rule => rule.basis === '民事訴訟法第501條第2項');
    expect(rules).toHaveLength(2);
    expect(rules.every(rule => rule.level === 'RECOMMENDED')).toBe(true);
  });

  it('binds the principled-importance route to frozen Article 469-1', () => {
    expect(CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE.sourceReference).toContain('civil_procedure_469_1.md');
    expect(CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'CIVIL_470_PRINCIPLED_IMPORTANCE', level: 'REQUIRED' })
    ]));
  });

  it('keeps formats without a frozen official profile fail-closed', () => {
    expect(FORMAT_PROFILES.civil.formatConfirmed).toBe(true);
    expect(FORMAT_PROFILES.family.formatRuleSource).toContain('第4條準用民事訴訟書狀規則');
    expect(FORMAT_PROFILES.criminal.formatConfirmed).toBe(false);
    expect(FORMAT_PROFILES.administrative_litigation.formatConfirmed).toBe(false);
    expect(FORMAT_PROFILES.juvenile.formatConfirmed).toBe(false);
    expect(FORMAT_PROFILES.non_contentious.formatConfirmed).toBe(false);
  });

  it('keeps family litigation and family non-contentious format profiles distinct', () => {
    expect(FAMILY_FORMAT_PROFILES.litigation.formatRuleSource).toContain('第4條');
    expect(FAMILY_FORMAT_PROFILES.non_contentious.formatRuleSource).toContain('第5條至第7條');
    expect(FAMILY_FORMAT_PROFILES.non_contentious.marginsCm).toBeNull();
    expect(FAMILY_FORMAT_PROFILES.non_contentious.pageNumbering).toBe(false);
  });

  it('binds every procedural legal reference to normalized frozen text', () => {
    for (const group of Object.values(PROCEDURAL_LEGAL_REFERENCES)) {
      for (const reference of group) {
        const source = readFileSync(reference.sourceReference, 'utf8');
        const exactText = source.match(/## Exact Official Text\r?\n([\s\S]*?)\r?\n## Notes/)?.[1]
          .replace(/\r\n/g, '\n')
          .trim();
        expect(exactText, reference.sourceReference).toBeTruthy();
        expect(createHash('sha256').update(exactText!, 'utf8').digest('hex')).toBe(reference.contentHash);
      }
    }
  });
});
