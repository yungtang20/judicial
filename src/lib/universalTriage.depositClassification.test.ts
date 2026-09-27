import { describe, it, expect } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

/**
 * 押金返還與修繕瑕疵是兩種不同的爭議。
 *
 * 實測：輸入「房東扣除清潔費後僅願返還押金剩餘 30,000 元」，
 * 系統卻標為「租賃契約修繕爭議 / 房屋漏水侵權損害賠償」，
 * 法律依據指向「出租人修繕義務（民法第429、430條）」，
 * 建議行動是「拍攝漏水受損部位照片」「催告房東進場修繕」，
 * 證據清單要的是「漏水現場受損照片」——全部與押金案情無關。
 *
 * 使用者會被引導到不相關的法律依據與不適用的行動。
 */
describe('租賃類案件的爭議分類', () => {
  const depositCase =
    '民國113年4月20日我與房東簽訂租賃契約，押金新臺幣50,000元。民國114年7月1日租期屆滿我已交還房屋，' +
    '房東稱依契約第8條扣除清潔費20,000元後僅願返還剩餘30,000元，至今未付。';
  const repairCase =
    '房屋天花板漏水，通知房東後一個月仍未修繕，我自行雇工花費35,000元，請問能否求償。';

  it('押金未退還應歸為押金返還爭議', () => {
    const r = buildIntelligentRuleBasedTriage(depositCase);
    expect(r.identifiedIssue).toBe('租賃押金返還爭議');
  });

  it('押金爭議不得指向出租人修繕義務', () => {
    const r = buildIntelligentRuleBasedTriage(depositCase);
    const basis = r.legalBasis.join('、');
    expect(basis).not.toContain('修繕義務');
    expect(basis).not.toContain('429');
  });

  it('押金爭議的建議行動不得要求拍照漏水或催告修繕', () => {
    const r = buildIntelligentRuleBasedTriage(depositCase);
    const actions = r.suggestedActions.join('、');
    expect(actions).not.toContain('漏水');
    expect(actions).not.toContain('修繕');
  });

  it('押金爭議的證據清單應含押金憑證與交屋文件', () => {
    const r = buildIntelligentRuleBasedTriage(depositCase);
    const evidence = r.evidenceChecklist.join('、');
    expect(evidence).toMatch(/押金|收據|匯款/);
    expect(evidence).toMatch(/交屋|交還/);
  });

  it('真正的修繕案件維持原有分類與建議', () => {
    const r = buildIntelligentRuleBasedTriage(repairCase);
    expect(r.identifiedIssue).toContain('修繕爭議');
    expect(r.legalBasis.join('、')).toContain('修繕義務');
  });

  it('押金與修繕同時出現時，維持修繕分類', () => {
    const mixed = '房東押金五萬元未退還，而且房屋漏水也不修。';
    const r = buildIntelligentRuleBasedTriage(mixed);
    expect(r.identifiedIssue).toContain('修繕爭議');
  });
});
