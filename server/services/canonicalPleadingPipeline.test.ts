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
    expect(getCourtPleadingConfig('CIVIL_ANSWER')).not.toBeNull();
    expect(getCourtPleadingConfig('CIVIL_APPEAL_SECOND')).not.toBeNull();
    expect(getCourtPleadingConfig('CIVIL_APPEAL_THIRD_PRINCIPLED')).not.toBeNull();

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

  it('delivers a complete civil answer through its exact profile', async () => {
    const result = await executeCanonicalPleadingPipeline('CIVIL_ANSWER', {
      ...completeCivilInput,
      claimStatement: '原告之訴駁回。',
      answerFactsAndReasons: '被告否認借款契約成立。',
      opponentPosition: '否認原告所稱借款交付，匯款用途另有原因。',
      documentaryEvidenceCopies: '被證一影本一份。',
      directNotice: '書證影本將依法直接通知原告。'
    });

    expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
    expect(result.documentText).toContain('被告否認借款契約成立。');
    expect(result.documentText).toContain('書證影本將依法直接通知原告。');
  });

  it('delivers a complete civil second appeal only with exact appeal fields', async () => {
    const result = await executeCanonicalPleadingPipeline('CIVIL_APPEAL_SECOND', {
      ...completeCivilInput,
      claimStatement: '原判決廢棄。',
      challengedJudgment: '臺灣臺中地方法院115年度訴字第1號第一審判決，依法提起上訴。',
      appealDisposition: '就原告敗訴部分全部不服，請求廢棄並改判。',
      appealReasons: '原判決對匯款證據之認定與卷內資料不符。',
      appealSupportingFactsAndEvidence: '匯款紀錄顯示款項性質，證據為原證一。'
    });

    expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
    expect(result.documentText).toContain('原判決對匯款證據之認定與卷內資料不符。');
  });

  it.skip('blocks a criminal appeal with missing reasons before its unverified format can be mistaken as ready', async () => {
    const error = await executeCanonicalPleadingPipeline('CRIMINAL_APPEAL_SECOND', {
      courtName: '臺灣臺中地方法院',
      copies: '繕本一份',
      documentDate: '民國115年9月14日',
      signature: '甲○○'
    }).catch(value => value);

    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'appeal_reasons', sourceRequirement: 'CRIMINAL_361_REASONS' })
    ]));
  });

  it('blocks enforcement when the execution-title discriminator is missing', async () => {
    const error = await executeCanonicalPleadingPipeline('CIVIL_ENFORCEMENT_APPLICATION', {
      ...completeCivilInput,
      rightToBeRealized: '依確定判決請求清償新臺幣100,000元。',
      enforcementTitleDocuments: '確定判決正本及確定證明書。'
    }).catch(value => value);

    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'enforcementTitleType', sourceRequirement: '強制執行法第6條第1項' })
    ]));
  });

  it.skip('blocks an incomplete conditional legal representative instead of dropping it', async () => {
    const error = await executeCanonicalPleadingPipeline('CIVIL_APPEAL_SECOND', {
      ...completeCivilInput,
      challengedJudgment: '臺灣臺中地方法院115年度訴字第1號判決，依法提起上訴。',
      appealDisposition: '原判決廢棄。',
      appealReasons: '原判決認定與卷內資料不符。',
      appealSupportingFactsAndEvidence: '原證一可證明匯款性質。',
      legalRepresentativeName: '丙○○'
    }).catch(value => value);

    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'representatives[0].address' }),
      expect.objectContaining({ field: 'representatives[0].relationshipToParty' })
    ]));
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

  it.skip.each([
    'CIVIL_COMPLAINT_GENERAL',
    'PAYMENT_ORDER_PETITION',
    'CRIMINAL_SUPPLEMENTARY_CIVIL',
    'SPOUSAL_RIGHT_INFRINGEMENT'
  ])('blocks empty input for %s', async category => {
    await expect(executeCanonicalPleadingPipeline(category, {})).rejects.toMatchObject({
      code: 'CANONICAL_PLEADING_INPUT_REQUIRED'
    });
  });

  it.skip('returns explicit missing inputs without generating fallback facts', async () => {
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

  it.skip('does not substitute a configured proceeding when the user omits it', async () => {
    const error = await executeCanonicalPleadingPipeline('CIVIL_COMPLAINT_GENERAL', {
      ...completeCivilInput,
      proceeding: undefined
    }).catch(value => value);

    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'proceeding' })
    ]));
  });

  it.skip('does not treat a supplementary criminal case number as the proceeding', async () => {
    const error = await executeCanonicalPleadingPipeline('CRIMINAL_SUPPLEMENTARY_CIVIL', {
      ...completeCivilInput,
      proceeding: undefined,
      caseNo: '115年度訴字第123號'
    }).catch(value => value);

    expect(error).toBeInstanceOf(CanonicalPleadingInputError);
    expect(error.missingInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'proceeding' })
    ]));
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
