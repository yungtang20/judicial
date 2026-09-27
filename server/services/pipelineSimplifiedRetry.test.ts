// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LegalGenerationPipeline } from './legalGenerationPipeline.js';

/**
 * 產出含簡體中文時，法律文件路徑必須先給模型一次改用繁體的再生成機會。
 *
 * 實測：對話路徑（`agentChat`）有這個機會，
 * 但產生法律文件的管線只有阻擋、沒有重試——
 * 而後者的用字正確性要求更高。
 * 結果是大多數只需換個用字就能通過的產出，直接被丟棄並退回範本。
 */
const 繁體 = '原告請求被告返還借款，事實清楚，證據充足。';
const 簡體 = '原告請求被告返還借款，事实清楚，证据充足。';

const 檢索服務 = {
  search: async () => ({ enabled: false, provider: 'none' as const, sources: [], allowedCitations: [] }),
  retrieveContext: async () => ({
    sources: { enabled: false, provider: 'none' as const, sources: [], allowedCitations: [] },
    promptBlock: '',
    allowedCitations: [] as string[],
    literature: []
  })
};

const 建管線 = (輸出序列: string[]) => {
  let 次數 = 0;
  const provider = {
    generate: vi.fn(async () => ({ text: 輸出序列[Math.min(次數++, 輸出序列.length - 1)] }))
  };
  // 建構簽名為 (retrievalService, defaultProvider)
  const 管線 = new LegalGenerationPipeline(檢索服務 as never, provider as never);
  return { 管線, provider, 呼叫次數: () => 次數 };
};

const 執行 = (管線: LegalGenerationPipeline, 簡體重試 = true) =>
  管線.execute({
    buildPrompt: () => '請依下列事實撰寫書狀',
    parseResponse: (t: string) => ({ documentText: t }),
    simplifiedRetry: 簡體重試
  } as never);

describe('法律文件管線的簡體中文再生成', () => {
  beforeEach(() => { vi.resetModules(); });

  it('產出含簡體時必須重新生成一次，並可取得繁體產出', async () => {
    const { 管線, 呼叫次數 } = 建管線([簡體, 繁體]);
    const 結果 = await 執行(管線);
    expect(呼叫次數(), '未因簡體中文而重新生成').toBe(2);
    expect(結果.documentText).toContain('事實清楚');
  });

  it('重新生成後仍為簡體時必須阻擋交付', async () => {
    const { 管線, 呼叫次數 } = 建管線([簡體]);
    let 擲出: Error | null = null;
    try {
      await 執行(管線);
    } catch (e) {
      擲出 = e as Error;
    }
    expect(擲出, '簡體中文必須阻擋交付').not.toBeNull();
    expect(String(擲出?.message)).toMatch(/簡體|繁體/);
    // 仍應重試過一次
    expect(呼叫次數()).toBeGreaterThanOrEqual(2);
  });

  it('產出本來就是繁體時不得多呼叫一次', async () => {
    const { 管線, 呼叫次數 } = 建管線([繁體]);
    const 結果 = await 執行(管線);
    expect(結果.documentText).toContain('事實清楚');
    expect(呼叫次數(), '繁體產出不應觸發再生成').toBe(1);
  });

  it('可停用再生成機會（供測試與特殊情境使用）', async () => {
    const { 管線, 呼叫次數 } = 建管線([簡體]);
    let 擲出: Error | null = null;
    try {
      await 執行(管線, false);
    } catch (e) {
      擲出 = e as Error;
    }
    expect(擲出).not.toBeNull();
    expect(呼叫次數(), '停用後不得重新生成').toBe(1);
  });
});
