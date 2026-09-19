import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CanonicalPleadingInputError,
  executeCanonicalPleadingPipeline
} from './canonicalPleadingPipeline.js';
import {
  CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE,
  getCourtPleadingConfig
} from '../../src/lib/rules/courtPleadingRuleProfiles.js';

const completeCivilInput = {
  courtName: '臺灣臺中地方法院',
  plaintiffName: '甲○○',
  plaintiffAddress: '臺中市測試區原告路1號',
  defendantName: '乙○○',
  defendantAddress: '臺中市測試區被告路2號',
  proceeding: '返還借款事件',
  claimStatement: '被告應給付原告新臺幣100,000元。',
  facts: '原告於民國113年1月1日交付借款，清償期屆至後被告仍未返還。',
  evidenceDetails: '原證一：匯款紀錄',
  documentDate: '民國115年9月13日',
  signature: '甲○○'
};

describe('canonical pleading pipeline', () => {
  it('supports only categories backed by an approved structure and mapping', () => {
    expect(getCourtPleadingConfig('CIVIL_COMPLAINT_GENERAL')).not.toBeNull();
    expect(getCourtPleadingConfig('PAYMENT_ORDER_PETITION')).not.toBeNull();
    expect(getCourtPleadingConfig('CRIMINAL_SUPPLEMENTARY_CIVIL')).not.toBeNull();

    for (const category of [
      'JUDICIAL_CIVIL_TEMPLATE',
      'UNIVERSAL_AI_PLEADING',
      'CRIMINAL_COMPLAINT',
      'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
      'DOMESTIC_VIOLENCE_PROTECTION_ORDER'
    ]) {
      expect(getCourtPleadingConfig(category)).toBeNull();
    }
  });

  it('maps supplementary civil rules only through approved §492 incorporation', () => {
    expect(CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE.rules).not.toHaveLength(0);
    expect(CRIMINAL_SUPPLEMENTARY_CIVIL_RULE_PROFILE.rules.every(rule =>
      rule.basis.startsWith('刑事訴訟法第492條準用') &&
      rule.sourceReferences?.includes('legal_references/criminal_procedure_492.md')
    )).toBe(true);

    const payment = getCourtPleadingConfig('PAYMENT_ORDER_PETITION');
    expect(payment?.ruleProfile.rules.some(rule => rule.basis.includes('第508條'))).toBe(false);
  });

  it.each([
    'CIVIL_COMPLAINT_GENERAL',
    'PAYMENT_ORDER_PETITION',
    'CRIMINAL_SUPPLEMENTARY_CIVIL',
    'SPOUSAL_RIGHT_INFRINGEMENT'
  ])('blocks empty input for %s', async category => {
    await expect(executeCanonicalPleadingPipeline(category, {})).rejects.toMatchObject({
      code: 'CANONICAL_PLEADING_INPUT_REQUIRED'
    });
  });

  it('returns explicit missing inputs without generating fallback facts', async () => {
    const error = await executeCanonicalPleadingPipeline('CIVIL_COMPLAINT_GENERAL', {})
      .catch(value => value);
    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs.map((item: { field: string }) => item.field)).toEqual(expect.arrayContaining([
      'parties[0].name',
      'parties[0].address',
      'parties[1].name',
      'parties[1].address',
      'statements',
      'evidence',
      'court',
      'date',
      'signature',
      'subject_and_facts',
      'judgment_relief'
    ]));
    expect(error.message).not.toContain('臺灣臺北');
    expect(error.message).not.toContain('詳如附件');
  });

  it('delivers a fully supplied civil complaint without substituting defaults', async () => {
    const result = await executeCanonicalPleadingPipeline('CIVIL_COMPLAINT_GENERAL', completeCivilInput);
    expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
    expect(result.documentText).toContain(completeCivilInput.plaintiffName);
    expect(result.documentText).toContain(completeCivilInput.defendantAddress);
    expect(result.documentText).toContain(completeCivilInput.facts);
    expect(result.documentText).toContain('件數：0');
    expect(result.documentText).not.toContain('臺灣臺北');
    expect(result.complianceChecklist.every(item => item.passed)).toBe(true);
  });

  it('delivers supplementary civil input through the §492-mapped civil profile', async () => {
    const result = await executeCanonicalPleadingPipeline('CRIMINAL_SUPPLEMENTARY_CIVIL', {
      ...completeCivilInput,
      courtName: '臺灣臺中地方法院刑事庭',
      proceeding: '115年度訴字第123號刑事附帶民事訴訟事件'
    });
    expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
    expect(result.legalSources.map(source => source.sourceReference)).toEqual(expect.arrayContaining([
      'legal_references/criminal_procedure_487.md',
      'legal_references/criminal_procedure_492.md'
    ]));
  });

  it('treats §508 as payment-order eligibility, not a REQUIRED field mapping', async () => {
    await expect(executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      ...completeCivilInput,
      creditorName: '丙○○',
      creditorAddress: '臺中市測試區債權路3號',
      debtorName: '丁○○',
      debtorAddress: '臺中市測試區債務路4號',
      plaintiffName: undefined,
      plaintiffAddress: undefined,
      defendantName: undefined,
      defendantAddress: undefined
    })).rejects.toMatchObject({ code: 'CANONICAL_PLEADING_INPUT_REQUIRED' });

    await expect(executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      ...completeCivilInput,
      debtAmount: '金額待確認'
    })).rejects.toMatchObject({ code: 'CANONICAL_PLEADING_INPUT_REQUIRED' });

    const result = await executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      ...completeCivilInput,
      creditorName: '丙○○',
      creditorAddress: '臺中市測試區債權路3號',
      debtorName: '丁○○',
      debtorAddress: '臺中市測試區債務路4號',
      plaintiffName: undefined,
      plaintiffAddress: undefined,
      defendantName: undefined,
      defendantAddress: undefined,
      debtAmount: '100000'
    });
    expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
  });

  it('keeps configured legal-reference hashes bound to frozen Exact Official Text', () => {
    for (const category of ['CIVIL_COMPLAINT_GENERAL', 'PAYMENT_ORDER_PETITION', 'CRIMINAL_SUPPLEMENTARY_CIVIL']) {
      const config = getCourtPleadingConfig(category)!;
      for (const reference of config.legalReferences) {
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
