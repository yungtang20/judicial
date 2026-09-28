import { describe, expect, it } from 'vitest';
import { extractJsonFromText } from './extractJson';

/**
 * AI 回應的 JSON 擷取必須容忍夾帶內容。
 *
 * 實測：defense-triage 在只做「去 markdown 後整段 JSON.parse」時，
 * 3 次正式站呼叫有 2 次靜默降級成規則備援。回應其實有內容，
 * 但前後帶了說明文字，導致整段解析失敗。
 * 使用者等了近 30 秒，拿到一份外觀正常、實則沒有 AI 參與的分析。
 */
describe('AI 回應的 JSON 擷取', () => {
  it('整段就是合法 JSON 時直接解析', () => {
    const r = extractJsonFromText<{ a: number }>('{"a":1}');
    expect(r).toEqual({ a: 1 });
  });

  it('markdown 程式碼區塊包裝時可解析', () => {
    const r = extractJsonFromText<{ a: number }>('```json\n{"a":1}\n```');
    expect(r).toEqual({ a: 1 });
  });

  it('只有前綴說明文字時可解析', () => {
    const r = extractJsonFromText<{ a: number }>('好的，分析結果如下：{"a":1}');
    expect(r).toEqual({ a: 1 });
  });

  it('前後都有說明文字時可解析', () => {
    const r = extractJsonFromText<{ a: number }>('好的，以下是分析：{"a":1}\n希望對您有幫助。');
    expect(r).toEqual({ a: 1 });
  });

  it('陣列輸出時可解析', () => {
    const r = extractJsonFromText<string[]>('建議如下：\n["選項一","選項二","選項三"]');
    expect(r).toEqual(['選項一', '選項二', '選項三']);
  });

  it('巢狀物件時取最外層，不會截斷在內層', () => {
    const r = extractJsonFromText<{ outer: { inner: number } }>('結果：{"outer":{"inner":42}}');
    expect(r).toEqual({ outer: { inner: 42 } });
  });

  it('字串中的說明含有大括號時仍能解析', () => {
    const r = extractJsonFromText<{ reason: string }>('因為{條件}不成立，結論：{"reason":"不成立"}');
    expect(r).toEqual({ reason: '不成立' });
  });

  it('完全沒有 JSON 時回傳 null，由呼叫端決定降級', () => {
    expect(extractJsonFromText('這是一段完全沒有 JSON 的回應。')).toBeNull();
    expect(extractJsonFromText('')).toBeNull();
    expect(extractJsonFromText('   ')).toBeNull();
  });

  it('括號不配對時回傳 null，不得回傳半個物件', () => {
    expect(extractJsonFromText('{"a":1')).toBeNull();
  });

  it('空物件與空陣列是合法結果，不得當成失敗', () => {
    expect(extractJsonFromText('{}')).toEqual({});
    expect(extractJsonFromText('[]')).toEqual([]);
  });
});
