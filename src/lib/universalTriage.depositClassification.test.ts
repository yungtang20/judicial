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

/**
 * 車禍分類必須真的有車輛情境。
 *
 * 實測：先前「過失傷害」被納入車禍分支的判斷式，
 * 使得沒有車輛的過失傷害（例如走樓梯滑倒）被歸為車禍事故，
 * 法律依據引用「道路交通安全規則」、案件性質標為刑事告訴乃論，與案情不符。
 */
describe('車禍分類必須有車輛情境', () => {
  it('明確的車禍仍歸為車禍', () => {
    const r = buildIntelligentRuleBasedTriage('我騎機車在路口被對向機車撞到，腿部骨折住院。');
    expect(r.identifiedIssue).toContain('車禍');
  });

  it('沒有車輛的過失傷害不得歸為車禍', () => {
    const r = buildIntelligentRuleBasedTriage('我在賣場走樓梯滑倒受傷，業主未設警示標示，屬過失傷害。');
    expect(r.identifiedIssue).not.toContain('車禍');
    expect(r.legalBasis.join('、')).not.toContain('道路交通安全規則');
  });
});

/**
 * 動物相關爭議不一定有咬傷。
 *
 * 實測：「愛犬被機車撞死」「貓走失」「狗吠嚇到我跌倒」
 * 三種完全沒有咬傷的案件都被標為「寵物遭鄰犬/動物咬傷」，
 * 說明文字要求動物醫院診斷證明，與案情無關。
 */
describe('動物案件的分類須反映是否真有咬傷', () => {
  it('明確的咬傷維持原有分類', () => {
    const r = buildIntelligentRuleBasedTriage('鄰居的狗咬傷我的貓，貓尾巴骨折需要手術。');
    expect(r.identifiedIssue).toContain('咬傷');
  });

  it('愛犬被車撞死不應說成遭咬傷', () => {
    const r = buildIntelligentRuleBasedTriage('對方養狗未拴繩，愛犬被機車撞死，要求賠償。');
    expect(r.identifiedIssue).not.toContain('咬傷');
  });

  it('貓走失不應說成遭咬傷', () => {
    const r = buildIntelligentRuleBasedTriage('我的貓走失了，鄰居說看到跑進他家院子。');
    expect(r.identifiedIssue).not.toContain('咬傷');
  });

  it('狗吠嚇到跌倒的證據清單不應要求動物醫院診斷', () => {
    const r = buildIntelligentRuleBasedTriage('鄰居養的狗吠嚇到我，我驚嚇跌倒受傷。');
    const evidence = r.evidenceChecklist.join('、');
    expect(evidence).not.toContain('動物醫院');
    expect(evidence).toMatch(/現場照片|監視器/);
  });
});
