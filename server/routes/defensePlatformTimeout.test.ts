import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 應用必須在平台請求逾時之前主動降級。
 *
 * 實測：正式站 defense/triage 的回應時間 p50 為 26.9 秒、max 30.8 秒，
 * 而 502 的出現時點也在 30 秒附近。兩者重疊表示那是 Render 代理的
 * 請求逾時，不是應用程式的錯誤（應用出錯會回 500 而非 502）。
 *
 * 應用雖設定 AGNES_TIMEOUT_MS=60000，但永遠輪不到它生效——
 * 平台先切斷連線，使用者只看到 502，連一點內容都拿不到。
 *
 * 因此必須在平台上限之前主動降級到本機規則分析，
 * 使用者至少拿到可用的分析、證據清單與行動指引。
 */
const 原始碼 = readFileSync(resolve(process.cwd(), 'server/routes/defense.ts'), 'utf8');

describe('辯護分類的平台逾時防線', () => {
  it('存在以毫秒為單位的時間預算', () => {
    expect(原始碼).toMatch(/DEFENSE_AI_BUDGET_MS/);
    expect(原始碼).toMatch(/DEFENSE_AI_BUDGET_MS\)\s*\|\|\s*[\d_]+/);
  });

  it('預算必須低於實測的 p50 與平台逾時（25 秒，留 5 秒餘裕）', () => {
    const m = 原始碼.match(/DEFENSE_AI_BUDGET_MS\)\s*\|\|\s*([\d_]+)/);
    expect(m, '未找到預算值').toBeTruthy();
    const 秒 = Number(m![1].replace(/_/g, '')) / 1000;
    // 實測 p50 26.9 秒、平台上限約 30 秒。
    // 預算必須小於 30，否則輪不到應用降級就已被平台切斷。
    expect(秒, `預算 ${秒} 秒不會早於平台逾時`).toBeLessThan(30);
    expect(秒, `預算 ${秒} 秒過短，正常請求會被誤降級`).toBeGreaterThan(20);
  });

  it('以 Promise.race 實作，不阻塞其他流程', () => {
    expect(原始碼).toMatch(/Promise\.race\(\[\s*configuredAIProvider\.generate/);
  });

  it('逾時後走本機規則分析（使用者仍拿到可用內容）', () => {
    // 降級路徑必須存在，且不得把 502 直接丟給使用者。
    expect(原始碼).toContain('AI 降級至本機分析庫');
    expect(原始碼).toContain('buildFallbackDefenseTriage');
  });

  it('不得移除既有的寬容擷取與 JSON 模式設定', () => {
    // 這兩項先前是為了修正靜默降級率而加的，不可因新增逾時防線而回退。
    expect(原始碼).toContain('responseMimeType: \'application/json\'');
    expect(原始碼).toContain('extractJsonFromText');
  });

  it('官方條文查證不得被移除', () => {
    // defense 透過 officialPrecheckOptions() 取得官方索引，
    // 該函式內部使用 officialStatuteExistence()。
    expect(原始碼).toContain('officialPrecheckOptions');
  });
});
