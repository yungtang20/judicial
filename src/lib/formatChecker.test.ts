import { describe, expect, it } from 'vitest';
import { verifyDocumentFormat } from './formatChecker';

const completeText = `
原告甲，住所：臺北市
被告乙，住所：新北市
損害賠償事件
訴之聲明：被告應給付原告。
證據：契約書
附件：契約書影本，件數：1件
臺灣臺北地方法院
2026-09-12
具狀人：原告甲
`;

describe('legacy verifyDocumentFormat mapping', () => {
  it('maps §116 clauses 1-8 independently and never labels keyword presence COMPLIANT', () => {
    const checks = verifyDocumentFormat(completeText);
    const clauseIds = Array.from({ length: 8 }, (_, index) => `CIVIL_116_${index + 1}`);

    expect(clauseIds.every(id => checks.some(check => check.id === id))).toBe(true);
    expect(checks.filter(check => clauseIds.includes(check.id))).toHaveLength(8);
    expect(checks.every(check => check.status !== 'COMPLIANT')).toBe(true);
    expect(checks.find(check => check.id === 'CIVIL_116_2')).toMatchObject({
      legalBasis: '民事訴訟法第116條第1項第2款',
      status: 'NOT_APPLICABLE'
    });
  });

  it('keeps identifiers recommended and corrects the old evidence, attachment, court, and date bases', () => {
    const checks = verifyDocumentFormat(completeText);

    expect(checks.find(check => check.id === 'CIVIL_116_RECOMMENDED_IDENTIFIERS')).toMatchObject({
      legalBasis: '民事訴訟法第116條第2項',
      isRequired: false,
      status: 'WARNING'
    });
    expect(checks.find(check => check.id === 'CIVIL_116_5')?.legalBasis).toBe('民事訴訟法第116條第1項第5款');
    expect(checks.find(check => check.id === 'CIVIL_116_6')?.legalBasis).toBe('民事訴訟法第116條第1項第6款');
    expect(checks.find(check => check.id === 'CIVIL_116_7')?.legalBasis).toBe('民事訴訟法第116條第1項第7款');
    expect(checks.find(check => check.id === 'CIVIL_116_8')?.legalBasis).toBe('民事訴訟法第116條第1項第8款');
    expect(checks.find(check => check.id === 'CIVIL_116_1')?.description).not.toMatch(/身分證|統一編號/);
  });

  it('applies §244 only when the caller identifies a complaint', () => {
    expect(verifyDocumentFormat(completeText).some(check => check.id.startsWith('CIVIL_244_'))).toBe(false);
    const complaintChecks = verifyDocumentFormat(`${completeText}\n訴訟標的及原因事實`, {
      pleadingType: 'complaint'
    });

    expect(complaintChecks.filter(check => check.id.startsWith('CIVIL_244_'))).toHaveLength(3);
    expect(complaintChecks.find(check => check.id === 'CIVIL_244_2')?.legalBasis).toBe('民事訴訟法第244條第1項第2款');
  });
});
