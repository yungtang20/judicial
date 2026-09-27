import { describe, expect, it } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

/**
 * 分類分支的排序回歸。
 *
 * 實測發現：純民事的租屋押金返還爭議被歸為刑事竊盜／侵占，
 * 並引用刑法第320條、第335條。原因是「不還」這關鍵字命中了
 * 竊盜分支，而該分支排在租屋押金分支之前。
 */
describe('租屋押金不得被誤判為刑事竊盜侵占', () => {
  const 民事押金說法 = [
    '我上個月在租屋處退租時，房東扣住五萬元押金不還，說要收清潔費但沒收據，也沒有簽任何扣除清單。房屋押金應如何取回？',
    '房東不退押金怎麼辦',
    '退租時押金被扣下來不還',
    '保證金被房東沒收'
  ];

  it.each(民事押金說法)('押金爭議應判為民事：%s', query => {
    const r = buildIntelligentRuleBasedTriage(query);
    expect(r.caseType).toBe('CIVIL');
    expect(r.category).not.toBe('CRIMINAL_COMPLAINT_THEFT');
    const 法條文字 = (r.legalBasis || []).join(' ') + (r.statuteAnalysis || '');
    expect(法條文字).not.toMatch(/刑法第32[04]條|刑法第335條/);
  });

  // 修正不能連帶讓真正的竊盜案件失守
  const 刑事說法 = [
    '同事把我的筆電拿去不還',
    '有人偷走我的行李',
    '他擅自拿走我的財物不肯歸還'
  ];

  it.each(刑事說法)('真正的侵占竊盜仍應判為刑事：%s', query => {
    const r = buildIntelligentRuleBasedTriage(query);
    expect(r.category).toBe('CRIMINAL_COMPLAINT_THEFT');
  });

  it('借錢不還仍維持純民事', () => {
    const r = buildIntelligentRuleBasedTriage('借錢不還對方一直拖');
    expect(r.caseType).toBe('CIVIL');
    expect(r.category).not.toBe('CRIMINAL_COMPLAINT_THEFT');
  });
});
