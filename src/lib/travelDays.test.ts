import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRAVEL_DAYS_OPTIONS } from './travelDays';

/**
 * 在途期間天數必須在所有畫面一致。
 *
 * 實測缺陷：SmartAppealAssistant 只有 0/2/4 天三個選項，
 * 且把 4 天標為「長途/離島」；而 AppealDeadlineTool 依司法院標準
 * 列出 0/2/3/4/5/8 天六級，離島是 8 天。
 *
 * 同一個法律概念在兩個畫面給出不同天數。在金門、馬祖、澎湖的當事人
 * 若用了前者，期限會少算 4 天——在 20 日不變期間內，這可能直接
 * 導致喪失上訴權。
 *
 * 這類缺陷靠人工檢視很難發現（兩處各自都「看起來合理」），
 * 因此固定成測試。
 */
describe('在途期間天數的一致性', () => {
  const 使用該表的元件 = ['src/components/SmartAppealAssistant.tsx', 'src/components/AppealDeadlineTool.tsx'];

  it('共用表包含離島的 8 天', () => {
    // 司法院標準：金門、馬祖等離島地區 8 天。
    const 離島 = TRAVEL_DAYS_OPTIONS.find((o) => o.label.includes('離島'));
    expect(離島, '共用表缺少離島選項').toBeDefined();
    expect(離島!.days).toBe(8);
  });

  it('共用表涵蓋完整的六級天數', () => {
    expect(TRAVEL_DAYS_OPTIONS.map((o) => o.days)).toEqual([0, 2, 3, 4, 5, 8]);
  });

  it('不得有選項把 4 天標為離島', () => {
    // 「4 天（長途/離島）」正是原始缺陷的寫法。
    for (const o of TRAVEL_DAYS_OPTIONS) {
      if (o.label.includes('離島')) {
        expect(o.days, `「${o.label}」的天數錯誤`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it.each(使用該表的元件)('%s 必須引用共用表', (f) => {
    const s = readFileSync(join(process.cwd(), f), 'utf8');
    expect(s, `${f} 未引用 src/lib/travelDays`).toContain('travelDays');
  });

  it.each(使用該表的元件)('%s 不得自行定義在途天數', (f) => {
    const s = readFileSync(join(process.cwd(), f), 'utf8');
    // 自行寫一份 <option value={N}> 就是日後漂移的來源
    const 自定義 = s.match(/<option\s+value=\{(\d+)\}[^>]*>[^<]*天/);
    expect(自定義, `${f} 自行定義了在途天數選項，應改用共用表`).toBeNull();
  });
});
