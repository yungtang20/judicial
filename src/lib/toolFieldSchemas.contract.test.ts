import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';

/**
 * 表單欄位必須涵蓋範本實際需要的欄位。
 *
 * 實測（真人模擬「我被房東趕出門口」時發現）：
 * 27 個工具的表單欄位不足以產出文件，總計缺 93 個欄位。
 * 其中 DEMAND_LETTER_RENT_DEFAULT 缺 6 個（leaseAddress、monthlyRent…），
 * 使用者把表單上看得見的欄位全部填滿，仍然產製不出任何文件——
 * 只能看到「書狀仍有未填寫的欄位」。
 *
 * 這與「未填欄位不得交付」的 fail-closed 閘門並不衝突：
 * 閘門擋下壞文件是對的，但使用者必須有辦法填齊才能產出好文件。
 * 兩件事都要成立。
 *
 * 這是「前後端欄位脫節」的第三個實例（先前兩例為 defense scan-mines
 * 與 defense triage），本測試讓這類脫節無法再單點復發。
 */

const 範本原始碼 = readFileSync(join(process.cwd(), 'src/utils/toolboxFallbacks.ts'), 'utf8');

/** 以 case 邊界切分，避免括號配對被註解或字串干擾。 */
function 範本欄位(): Map<string, string[]> {
  const 邊界 = [...範本原始碼.matchAll(/\bcase\s+'([A-Z_0-9]+)'\s*:/g)].map((m) => ({ 名: m[1], 位: m.index }));
  邊界.push({ 名: '__END__', 位: 範本原始碼.length });
  const 區塊表 = new Map<string, string>();
  for (let i = 0; i < 邊界.length - 1; i++) {
    // case 可 fallthrough（case 'A': case 'B': {），數個名稱共用同一段
    for (let j = i; j < 邊界.length - 1; j++) {
      if (邊界[j].位 >= 邊界[i + 1].位) break;
      const 單段 = 範本原始碼.slice(邊界[j].位, 邊界[j + 1].位);
      區塊表.set(邊界[j].名, (區塊表.get(邊界[j].名) || '') + 單段);
    }
  }
  const 結果 = new Map<string, string[]>();
  for (const [名, 段] of 區塊表) {
    const 鍵 = [...new Set([...段.matchAll(/params\.([a-zA-Z]+)/g)].map((m) => m[1]))];
    if (鍵.length) 結果.set(名, 鍵);
  }
  return 結果;
}

const 範本 = 範本欄位();

describe('表單欄位與範本需求一致', () => {
  it('有範本實作的工具，表單必須涵蓋範本讀取的所有欄位', () => {
    const 缺口: string[] = [];
    for (const [工具, 範本鍵] of 範本) {
      const 表單 = TOOL_FIELD_SCHEMAS[工具];
      if (!表單) continue;
      const 表單鍵 = 表單.map((f) => f.key);
      const 缺 = 範本鍵.filter((k) => !表單鍵.includes(k));
      if (缺.length) 缺口.push(`${工具}：表單缺少 ${缺.join(', ')}`);
    }
    expect(缺口,
      `以下工具的表單欄位不足以產出文件，使用者填滿表單仍會被擋：\n${缺口.join('\n')}`,
    ).toEqual([]);
  });

  it('每個表單欄位都必須有中文標籤', () => {
    // 無標籤的欄位在畫面上會顯示空白，使用者不知道要填什麼。
    const 無標籤: string[] = [];
    for (const [工具, 表單] of Object.entries(TOOL_FIELD_SCHEMAS)) {
      for (const f of 表單) {
        if (!f.label || !f.label.trim()) 無標籤.push(`${工具}.${f.key}`);
      }
    }
    expect(無標籤, `以下欄位缺少中文標籤：\n${無標籤.join('\n')}`).toEqual([]);
  });

  it('掃描確實涵蓋了範本（避免測試因解析失效而空轉）', () => {
    expect(範本.size, '未解析到任何範本，測試可能已失效').toBeGreaterThan(20);
  });
});
