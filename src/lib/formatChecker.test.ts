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

  // 邊界樣本：關鍵詞「幾乎存在但差一點」，驗證 regex 不會把差一個字的寫法當成齐備
  const get = (text: string, pleadingType?: 'complaint') => {
    const checks = verifyDocumentFormat(text, pleadingType ? { pleadingType } : {});
    return (id: string) => checks.find(check => check.id === id);
  };

  it('CIVIL_116_6 邊界：有「附件」但無件數/數字 → 不判齊備', () => {
    const text = '原告甲，住所：臺北市\n附件：契約書影本\n臺灣臺北地方法院';
    expect(get(text)('CIVIL_116_6')?.status).toBe('MISSING');
  });

  it('CIVIL_116_6 邊界：有件數數字但無「附件」關鍵詞 → 不判齊備', () => {
    const text = '原告甲，住所：臺北市\n件數：3件\n臺灣臺北地方法院';
    expect(get(text)('CIVIL_116_6')?.status).toBe('MISSING');
  });

  it('CIVIL_116_6 邊界：「附屬文件」但件數寫成文字「一件」而非數字 → 不判齊備', () => {
    const text = '原告甲，住所：臺北市\n附屬文件：證物，一件\n臺灣臺北地方法院';
    // /\d+\s*件/ 不吃中文數字；「附件|附屬文件」命中但件數 regex 不中 → MISSING
    expect(get(text)('CIVIL_116_6')?.status).toBe('MISSING');
  });

  it('CIVIL_116_8 邊界：只寫「年 月 日」無實際數字 → 不判齊備', () => {
    const text = '原告甲，住所：臺北市\n中華民國 ○○ 年 ○○ 月 ○○ 日\n具狀人：原告甲';
    // regex 需 中華民國+數字 / 數字日期 / 年+月+日 任一；「年 ○○ 月 ○○ 日」中「年 月 日」被 ○○ 隔開不連續
    expect(get(text)('CIVIL_116_8')?.status).toBe('MISSING');
  });

  it('CIVIL_116_8 邊界：只有 ISO 數字日期無「年」字 → 仍判齊備（regex 允許）', () => {
    const text = '原告甲，住所：臺北市\n2026/09/12\n具狀人：原告甲';
    expect(get(text)('CIVIL_116_8')?.status).toBe('WARNING'); // 關鍵詞偵測到，非 COMPLIANT
  });

  it('CIVIL_117 邊界：「簽名」單字但無「具狀人」上下文 → 仍判齊備（regex 寬）', () => {
    const text = '原告甲，住所：臺北市\n本件原告簽名確認\n臺灣臺北地方法院';
    expect(get(text)('CIVIL_117_SIGNATURE')?.status).toBe('WARNING');
  });

  it('§244 邊界：complaint 但缺「訴之聲明」關鍵詞 → CIVIL_244_3 不齊備', () => {
    const text = `${completeText}\n訴訟標的及原因事實`;
    expect(get(text, 'complaint')('CIVIL_244_2')?.status).toBe('WARNING');
  });
});
