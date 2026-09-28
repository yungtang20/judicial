import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleAgentChat } from './agentChat';
import { containsSimplifiedChinese } from '../../src/lib/traditionalChineseGuard';

/**
 * 對話回覆不得因夾帶少量簡體字而整段被擋下。
 *
 * 實測正式站多輪對話：第 2 輪（使用者只是更正金額 3800 → 非 38000）
 * 收到「系統偵測到本次回覆含簡體中文用字，已暫停顯示回覆。請重新提問或稍後再試。」
 *
 * 使用者得到的是錯誤訊息，卻不知道自己其實問了什麼。
 *
 * 先前處方式是「要求模型改用繁體重新回答」——一次完整的 AI 呼叫，
 * 等於把已花掉的時間再花一次（該輪實測 20.9 秒），而且不保證成功。
 * 改為本機確定性轉換後，轉不掉的才擋。
 */

/**
 * 「此时」「行动」是簡體專用字，必須轉換。
 * 「采」是台灣並用的繁體異體字，依專案既有規則刻意不轉換
 * （見 simplifiedTableVariantChars.test.ts 的異體字防護）。
 */
const 含簡體 = '依民法第179條規定，請對方於此時清償借款，否則將采取法律行动。';
const 純繁體 = '依民法第179條規定，請對方清償借款。';

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

const 提問 = { userInput: '我借錢給對方不還怎麼辦？', history: [] };

describe('對話的簡體中文處理', () => {
  beforeEach(() => {
    generate.mockReset();
  });

  it('夾帶少量簡體字時應轉換後交付，不得整段擋下', async () => {
    generate.mockResolvedValue({ text: 含簡體 });

    const 結果 = await handleAgentChat(提問);

    expect(結果.success).toBe(true);
    expect(結果.reply).not.toContain('系統偵測到本次回覆含簡體中文用字');
    expect(containsSimplifiedChinese(String(結果.reply))).toBe(false);
  });

  it('只轉換簡體專用字，異體字保持原樣', async () => {
    generate.mockResolvedValue({ text: 含簡體 });

    const 回 = String((await handleAgentChat(提問)).reply);

    // 簡體專用字必須被轉換
    expect(回).toContain('此時');
    expect(回).toContain('行動');
    // 采/採 是台灣並用的異體字，專案刻意不收錄於對照表。
    // 若把它轉成「採」，反而改動了使用者看到的文字。
    expect(回).toContain('采取');
  });

  it('已是繁體的回覆不得被更動', async () => {
    generate.mockResolvedValue({ text: 純繁體 });

    const 回 = String((await handleAgentChat(提問)).reply);

    expect(回).toBe(純繁體);
  });

  it('只呼叫一次 AI，不得為轉換再花一次', async () => {
    generate.mockResolvedValue({ text: 含簡體 });

    await handleAgentChat(提問);

    // 轉換是本機做的；先前為了轉換會多打一次上游呼叫（實測該輪 20.9 秒）。
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
