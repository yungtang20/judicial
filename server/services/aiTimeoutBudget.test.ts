import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AI 逾時不得短於實測延遲，否則正當回覆會被誤判為失敗。
 *
 * 實測正式站對話路徑：正常回應需 6.7 / 8 / 11 / 14.2 / 14.3 秒。
 * 原先 agentChat 硬寫 15 秒逾時，第 3 輪在 15.3 秒被判逾時、
 * 回 503「AI 回應逾時或發生錯誤」——使用者拿到錯誤而不是分析。
 *
 * 這與產生管線「30 秒太短」是同一型問題：逾時設得比實際延遲短，
 * 會把大量正當回覆誤判為上游故障。
 */
describe('AI 逾時設定', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('對話逾時不得少於 30 秒', () => {
    const s = read('server/services/agentChat.ts');
    // 抓取 AGENT_CHAT_TIMEOUT_MS 的預設值
    const m = s.match(/AGENT_CHAT_TIMEOUT_MS\)\s*\|\|\s*(\d+)/);
    expect(m, '未找到對話逾時設定').not.toBeNull();
    const 毫秒 = parseInt(m![1], 10);
    expect(毫秒, `對話逾時 ${毫秒}ms 短於實測延遲（正常回應需 6.7~14.3 秒），會產生虛假的 503`).toBeGreaterThanOrEqual(30000);
  });

  it('對話逾時必須可由環境變數調整', () => {
    // 寫死 15 秒時無法依部署環境的實際延遲調整。
    const s = read('server/services/agentChat.ts');
    expect(s).toContain('process.env.AGENT_CHAT_TIMEOUT_MS');
  });

  it('專案內不得有短於 30 秒的 AI 逾時', () => {
    const 目標 = [
      'server/services/agentChat.ts',
      'server/services/legalGenerationPipeline.ts',
      'server/routes/legalProcess.ts',
    ];
    const 過短: string[] = [];
    for (const f of 目標) {
      const s = read(f);
      for (const m of s.matchAll(/setTimeout\(\s*\(\)\s*=>\s*reject\([^)]*\),\s*(\d+)\s*\)/g)) {
        const 毫秒 = parseInt(m[1], 10);
        if (毫秒 < 30000) 過短.push(`${f}: ${毫秒}ms`);
      }
      const c = s.match(/const\s+\w*TIMEOUT\w*\s*=\s*(\d+)/);
      if (c && parseInt(c[1], 10) < 30000) 過短.push(`${f}: 常數 ${c[1]}ms`);
    }
    expect(過短, `AI 逾時過短，會把正當回覆誤判為失敗：\n${過短.join('\n')}`).toEqual([]);
  });
});
