import { describe, expect, it } from 'vitest';
import { toTraditionalChinese, containsSimplifiedChinese } from '../lib/traditionalChineseGuard';
import { toTraditionalChineseIn } from '../../server/routes/toTraditionalIn';

/**
 * 簡繁轉換必須保住 AI 的分析。
 *
 * 正式站實測：defense-triage 5 次呼叫全數降級，
 * 使用者拿到 41 字的通用規則輸出。原因是繁體閘門
 * 只要在整份 JSON 中發現一個簡體字就整份丟棄。
 *
 * AI 產出通常只夾帶少量簡體字（例如「担保」而非「擔保」），
 * 其餘是完整可用的法律分析。為幾個字丟棄全部，
 * 是把可修正的小瑕疵升級成「AI 完全沒用上」的結果。
 */
describe('簡繁轉換', () => {
  it('轉換常見的簡體字', () => {
    expect(toTraditionalChinese('担保')).toBe('擔保');
    expect(toTraditionalChinese('诉讼')).toBe('訴訟');
    expect(toTraditionalChinese('赔偿')).toBe('賠償');
  });

  it('已是繁體的文字不得被改動', () => {
    const 原文 = '本院認為，原告之請求有理，應予准許。';
    expect(toTraditionalChinese(原文)).toBe(原文);
  });

  it('轉換後不得殘留簡體字', () => {
    const 混合 = '本件涉及担保纠纷与赔偿问题，经审理认定事实清楚。';
    expect(containsSimplifiedChinese(toTraditionalChinese(混合))).toBe(false);
  });

  it('非字串輸入原樣輸出', () => {
    expect(toTraditionalChinese('')).toBe('');
  });
});

describe('物件遞迴轉換', () => {
  it('轉換巢狀物件的所有字串', () => {
    const 輸入 = {
      summary: '被告主张不在现场',
      detail: { note: '可调阅監視器', list: ['证据清单', '证人'] },
      count: 3,
      flag: true,
      empty: null,
    };
    const 輸出 = toTraditionalChineseIn(輸入);
    expect(輸出.summary).toBe('被告主張不在現場');
    expect(輸出.detail.note).toBe('可調閱監視器');
    expect(輸出.detail.list).toEqual(['證據清單', '證人']);
    expect(輸出.count).toBe(3);
    expect(輸出.flag).toBe(true);
    expect(輸出.empty).toBeNull();
  });

  it('轉換頂層陣列', () => {
    expect(toTraditionalChineseIn(['诉讼', '赔偿'])).toEqual(['訴訟', '賠償']);
  });

  it('整棵樹轉換後不得殘留簡體', () => {
    const 輸入 = { a: '担保', b: { c: ['赔偿'] }, d: '已经是繁体' };
    expect(containsSimplifiedChinese(JSON.stringify(toTraditionalChineseIn(輸入)))).toBe(false);
  });

  it('空值不得拋出', () => {
    expect(toTraditionalChineseIn(null)).toBeNull();
    expect(toTraditionalChineseIn(undefined)).toBeUndefined();
  });
});
