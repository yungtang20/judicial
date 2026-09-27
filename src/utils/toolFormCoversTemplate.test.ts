import { describe, it, expect } from 'vitest';
import { buildFallbackToolboxResult, hasDeterministicToolboxTemplate } from './toolboxFallbacks';
import { TOOL_FIELD_SCHEMAS } from '../lib/toolFieldSchemas';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';

const MARKER = '（待填寫）';

/**
 * 表單必須收集到模板所需的全部欄位，否則使用者永遠無法產出可交付的書狀。
 *
 * 背景：把模板中的捏造值改為「（待填寫）」並阻擋交付後，
 * 若表單沒有對應欄位讓使用者填寫，這個工具就永遠產不出可交付的文件——
 * 等於把「靜默產出捏造內容」變成「完全不能用」，兩者都不是可接受的結果。
 *
 * 實測曾有 11 個工具屬於後者（DEMAND_LETTER_DEBT、DIVORCE_AGREEMENT、
 * SPOUSAL_RIGHT_INFRINGEMENT、RESIDENTIAL_LEASE_CONTRACT 等），
 * 累計補上 35 個表單欄位才消除。
 */
describe('表單欄位足以完成模板', () => {
  const tools = LEGAL_TOOLS.filter(tool => hasDeterministicToolboxTemplate(tool.id));

  it('填滿表單所有欄位後，產出的書狀不得仍有待填標記', () => {
    const incomplete: Array<{ id: string; remaining: number }> = [];
    for (const tool of tools) {
      const schema = TOOL_FIELD_SCHEMAS[tool.id] || [];
      // 模擬使用者把每個欄位都填好
      const params = Object.fromEntries(
        schema.map(f => [f.key, f.key.includes('Address') ? '測試地址' : '測試內容'])
      );
      const doc = buildFallbackToolboxResult(tool.id, params).documentText;
      const remaining = doc.split(MARKER).length - 1;
      if (remaining > 0) incomplete.push({ id: tool.id, remaining });
    }
    expect(
      incomplete,
      `以下工具的表單缺少模板所需欄位，使用者永遠無法產出可交付的書狀：\n${JSON.stringify(incomplete)}`
    ).toEqual([]);
  });

  it('有確定性模板的類別都必須有表單欄位定義', () => {
    const missingSchema = tools.filter(tool => !(TOOL_FIELD_SCHEMAS[tool.id] || []).length);
    expect(missingSchema.map(t => t.id), '這些工具沒有表單欄位定義，使用者無從填寫').toEqual([]);
  });
});
