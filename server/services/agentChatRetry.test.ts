import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 上游暫時性故障應重試一次，且重試必須放在供應器層。
 *
 * 實測缺陷：正式站對相同輸入，出現過約 1/3 的 5xx 與逾時
 * （defense-triage、agent-chat 都發生過，失敗多半在 30 秒附近）。
 * 沒有重試時，使用者每次提問都可能撞上，直接看到失敗。
 *
 * 放在供應器層而非各路由：所有呼叫路徑一致受益——
 * 辯護分流、判決分析、追問、律師助理、書狀產製都經過這一層。
 * 只在 agentChat 加過一次，defense/triage 沒有，
 * 實測 defense/triage 也出現過 502，證明放錯層。
 *
 * 路由層不可再有重試：會與供應器層疊加，最壞發出四次請求。
 */
const 供應器 = readFileSync(
  resolve(process.cwd(), 'src/ai/providers/OpenAICompatibleProvider.ts'),
  'utf8'
);
const 路由 = readFileSync(
  resolve(process.cwd(), 'server/services/agentChat.ts'),
  'utf8'
);

describe('供應器層的暫時性故障重試', () => {
  it('重試實作於供應器層', () => {
    expect(供應器).toContain('requestWithRetry');
  });

  it('generate 與 generateStructured 都經過重試', () => {
    // 只包 generate 而漏掉 generateStructured，結構化輸出路徑仍會失敗。
    expect(供應器).toMatch(/generate\(prompt: string, options\?: AIProviderGenerateOptions\) \{ return this\.requestWithRetry/);
    expect(供應器).toContain('this.requestWithRetry(');
  });

  it('重試前先判斷是否為暫時性故障', () => {
    expect(供應器).toMatch(/if \(!暫時性\(firstError\)\) throw firstError;/);
  });

  it('設定類錯誤不得重試', () => {
    // 金鑰未設時重試永遠不會成功，只會把失敗延後。
    expect(供應器).toMatch(/API_KEY_UNAVAILABLE\|PROVIDER_CONFIG\|CONFIG_INVALID\|NO_API_KEY/);
    expect(供應器).toMatch(/if \(\/API_KEY_UNAVAILABLE[\s\S]*?return false;/);
  });

  it('暫時性故障涵蓋逾時、5xx、429、連線中斷與 AbortError', () => {
    // 直接檢查判斷式中是否含各故障樣式，避免以正則解析程式碼造成脆弱比對。
    for (const 樣式 of ['HTTP_5', 'HTTP_429', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'aborted', 'AbortError']) {
      expect(供應器, "暫時性故障判斷缺少 " + 樣式).toContain(樣式);
    }
  });

  it('重試之間有退避，且最多重試一次', () => {
    expect(供應器).toMatch(/setTimeout\(resolve, ATTEMPT_RETRY_MS\)/);
    expect(供應器).toContain('ATTEMPT_RETRY_MS = 800');
    // 遞迴呼叫 request（而非 requestWithRetry），確保不會無限重試。
    expect(供應器).not.toMatch(/requestWithRetry[\s\S]{0,200}requestWithRetry\(prompt/);
  });
});

describe('路由層不得重複重試', () => {
  it('agentChat 不得自行實作重試', () => {
    // 路由層重試會與供應器層疊加，最壞發出四次請求。
    expect(路由).not.toMatch(/const 暫時性故障 = /);
    expect(路由).not.toMatch(/catch \(第一次失敗\)/);
  });

  it('agentChat 應說明重試已移交供應器層', () => {
    expect(路由).toContain('requestWithRetry');
  });

  it('agentChat 仍應呼叫 AI（重試移出後不可漏掉呼叫）', () => {
    expect(路由).toMatch(/llmText = await callOnce\(prompt\);/);
  });
});
