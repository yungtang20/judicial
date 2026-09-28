import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleAgentChat } from './agentChat';

/**
 * 錯誤訊息必須與真實原因相符，否則使用者無從行動。
 *
 * 實測正式站：對話逾時預算是 45 秒，但上游在約 30 秒就回錯誤
 * （相同輸入分別得到 503 與「已降級」的 200）。
 * 原訊息卻寫「AI 回應逾時或發生錯誤」——
 * 逾時根本沒有觸發，說成逾時會讓人以為「再等一下」就有結果。
 */

const generate = vi.fn();

vi.mock('../../src/ai/providers/providerRegistry.js', () => ({
  defaultAIProvider: { generate: (...args: unknown[]) => generate(...args) },
  ProviderFactory: { get: () => ({ generate: (...args: unknown[]) => generate(...args) }) },
}));

vi.mock('../legalGenerationPipeline.js', () => ({
  defaultLegalGenerationPipeline: {
    execute: async ({ parseResponse }: { parseResponse: (t: string) => { documentText: string } }) => ({
      documentText: parseResponse('ok').documentText,
      payload: {},
    }),
  },
  defaultLegalRetrievalService: {
    retrieveContext: async () => ({ promptBlock: '', sources: [], isExternalRetrievalUsed: false }),
  },
}));

const 提問 = { userInput: '我被房東趕出門口怎麼辦？', history: [] as never[] };

describe('對話錯誤訊息的準確性', () => {
  beforeEach(() => {
    generate.mockReset();
    vi.unstubAllEnvs();
  });

  it('缺少金鑰時應說明需要設定，而非逾時', async () => {
    generate.mockRejectedValue(new Error('AGNES_API_KEY_UNAVAILABLE'));

    const 結果 = await handleAgentChat(提問);

    expect(結果.success).toBe(false);
    expect(結果.error).toContain('尚未完成設定');
    expect(結果.error).not.toContain('逾時');
  });

  it('上游錯誤時應說明是服務無法回應，而非逾時', async () => {
    // 實測情況：上游約 30 秒回錯誤，我方逾時是 45 秒、未觸發。
    generate.mockRejectedValue(new Error('AGNES_HTTP_503'));

    const 結果 = await handleAgentChat(提問);

    expect(結果.success).toBe(false);
    expect(結果.error).toContain('目前無法回應');
    expect(結果.error).not.toContain('逾時');
    // 給出可行動的建議，而不是讓使用者空等
    expect(結果.error).toMatch(/稍後|重新/);
  });

  it.each([
    ['AGNES_HTTP_429', '目前無法回應'],
    ['fetch failed', '目前無法回應'],
    ['ECONNRESET', '目前無法回應'],
    ['ETIMEDOUT', '目前無法回應'],
  ])('上游錯誤 %s 應歸類為服務無法回應', async (錯誤, 應包含) => {
    generate.mockRejectedValue(new Error(錯誤));

    const 結果 = await handleAgentChat(提問);

    expect(String(結果.error)).toContain(應包含);
  });

  it('無法歸類的錯誤仍保留通用訊息', async () => {
    generate.mockRejectedValue(new Error('某種未知問題'));

    const 結果 = await handleAgentChat(提問);

    expect(結果.success).toBe(false);
    expect(結果.error).toContain('AI 回應');
  });
});
