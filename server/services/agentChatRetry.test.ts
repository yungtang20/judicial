import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 上游暫時性故障應重試一次。
 *
 * 實測缺陷：正式站對完全相同的輸入連續送出 3 次，
 * 得到 2 次 200 與 1 次在 30.3 秒後的 503。
 * 程式碼本身的註解也記載「我方逾時是 45 秒，而上游在約 30 秒
 * 就回錯誤」——即這是上游的暫時性抖動，不是穩定故障。
 *
 * 沒有重試時，使用者每次提問都可能撞上，直接看到失敗。
 *
 * 重試必須有界，且不得重試設定類錯誤：金鑰未設的情況下
 * 重試永遠不會成功，只會把失敗延後，使用者多等一輪。
 */
const 原始碼 = readFileSync(
  resolve(process.cwd(), 'server/services/agentChat.ts'),
  'utf8'
);

describe('助理對話的暫時性故障重試', () => {
  it('存在重試邏輯', () => {
    expect(原始碼).toMatch(/catch \(第一次失敗\)/);
    expect(原始碼).toMatch(/await callOnce\(prompt\);\s*\n\s*}/);
  });

  it('重試前先判斷是否為暫時性故障', () => {
    // 沒有判斷就重試的話，設定錯誤也會重試，使用者白等一輪。
    expect(原始碼).toMatch(/if \(!暫時性故障\(第一次失敗\)\) throw 第一次失敗;/);
  });

  it('設定類錯誤不得重試', () => {
    expect(原始碼).toMatch(/if \(isProviderConfigError\(e\)\) return false;/);
  });

  it('暫時性故障涵蓋逾時、5xx、429 與連線中斷', () => {
    const m = 原始碼.match(/return \/[^;]*HTTP_5\\d\\d[^;]*\/i\.test\(m\);/);
    expect(m, '未找到暫時性故障的判斷式').toBeTruthy();
    for (const 樣式 of ['HTTP_5', 'HTTP_429', 'ECONNRESET', 'ETIMEDOUT', 'AGENT_CHAT_TIMEOUT']) {
      expect(m![0]).toContain(樣式.split('\\')[0].slice(0, 7));
    }
  });

  it('重試之間有退避，且只重試一次', () => {
    // 沒有退避會緊接著再撞一次同一個故障。
    expect(原始碼).toMatch(/setTimeout\(resolve, \d+\)/);
    // callOnce 在 try 與 catch 中各出現一次 = 最多兩次呼叫。
    const 次數 = (原始碼.match(/await callOnce\(prompt\)/g) || []).length;
    expect(次數).toBe(2);
  });

  it('重試失敗後仍走既有的降級路徑（不得吞掉錯誤）', () => {
    // 重試後仍失敗必須拋出，讓既有的 503 訊息與 requestId 正常產生。
    expect(原始碼).toMatch(/llmText = await callOnce\(prompt\);\s*\n\s*}/);
    expect(原始碼).toContain('AI 服務目前無法回應');
  });
});
