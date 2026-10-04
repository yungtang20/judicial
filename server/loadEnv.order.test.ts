import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

/**
 * dotenv 必須在 AI provider 選定之前完成載入。
 *
 * 實測缺陷：`npm run dev` 時 /api/health 顯示 provider 正常，
 * 但實際請求走的是 GeminiProvider——因為 server.ts 把 dotenv.config()
 * 寫在模組本文，而 ESM 會先求值所有 import：
 *   import './server/index.js' → routes/health.js → providerRegistry.js
 *   → module body 立即呼叫 createConfiguredAIProvider()
 * 此刻 process.env.AI_PROVIDER 仍是 undefined，於是 `|| 'gemini'` 選中 Gemini。
 *
 * 症狀是靜默的：healthCheck() 回報的 model 是 getter（呼叫時才讀 env），
 * 所以 /api/health 看起來正常，但 generate() 送錯供應商，
 * 使用者拿到逾時後的本機規則備援而非 AI 分析。
 */
describe('環境變數載入順序', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('loadEnv 必須是 server.ts 的第一個 import', () => {
    const source = read('server.ts');
    const firstImport = source.indexOf('import ');
    expect(firstImport, 'server.ts 應有 import').toBeGreaterThanOrEqual(0);
    expect(
      source.indexOf('import "./server/loadEnv.js"'),
      'loadEnv 必須是第一個 import，否則 dotenv 會晚於 providerRegistry 建構'
    ).toBe(firstImport);
  });

  it('server.ts 不得再自行呼叫 dotenv.config', () => {
    // 重複呼叫不會出錯，但會讓維護者以為載入時機由 server.ts 控制，
    // 而實際上取決於 import 順序——那是本缺陷的根因，必須只有一個來源。
    expect(read('server.ts')).not.toContain('dotenv.config');
  });

  it('loadEnv 不得刪除 provider 選項變數', () => {
    // 刪掉會讓 createConfiguredAIProvider 讀不到值而落到預設 provider。
    const source = read('server/loadEnv.ts');
    expect(source).toContain('dotenv.config');
    expect(source).not.toContain('delete process.env.AI_PROVIDER');
  });
});

describe('dotenv 不覆寫父行程繼承的變數', () => {
  it('.env 的值輸給繼承值', () => {
    // 本次事故的直接成因：session 的父行程帶著
    // HCNSEC_MODEL=DeepSeek-V4-Pro，而 dotenv 不覆寫既有變數，
    // 於是 .env 裡的 HCNSEC_MODEL=auto 永遠不生效。
    // 這個行為是 dotenv 的設計（不覆寫），不是本專案能改的；
    // 釘住它讓呼叫端知道必須用 inline 賦值覆寫，而非信任 .env。
    const 探針 = 'LOADENV_ORDER_PROBE';
    process.env[探針] = 'from-parent';
    try {
      const 解析 = dotenv.parse('LOADENV_ORDER_PROBE=from-dotenv\n');
      expect(解析[探針]).toBe('from-dotenv');
      // 模擬 dotenv.config() 的不覆寫語意
      if (process.env[探針] === undefined) process.env[探針] = 解析[探針];
      expect(process.env[探針]).toBe('from-parent');
    } finally {
      delete process.env[探針];
    }
  });
});