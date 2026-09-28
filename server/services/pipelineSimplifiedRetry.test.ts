// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { LegalGenerationPipeline } from './legalGenerationPipeline.js';
import { containsSimplifiedChinese, toTraditionalChinese } from '../../src/lib/traditionalChineseGuard.js';

/**
 * 產出含簡體中文時，法律文件管線必須用**確定性轉換**修正，
 * 不得要求模型重新生成。
 *
 * 先前處方式是「要求模型改用繁體重新生成」——那是一次完整的 AI 呼叫，
 * 等於把已花掉的 20~40 秒再花一次，而且不保證成功。
 * 實測 analyze-judgment 5 次呼叫仍有 1 次因簡體被擋（SIMPLIFIED_OUTPUT），
 * 也就是說花了兩倍的時間，仍然可能失敗。
 *
 * 改為本機轉換後：
 * - 只呼叫一次 AI
 * - 結果確定，不受模型運氣影響
 * - 轉換後若仍有殘留（對照表未涵蓋），繁體閘門照樣 fail-closed
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

describe('法律文件管線的簡體中文處理', () => {
  it('含簡體的產出會被轉為繁體，且只呼叫一次 AI', async () => {
    const { 管線, 呼叫次數 } = 建管線([簡體]);
    const 結果 = await 執行(管線);

    // 轉換是本機做的，不該再多花一次上游呼叫。
    // 先前的做法要呼叫兩次，等於把 20~40 秒花兩次且仍可能失敗。
    expect(呼叫次數(), '轉換不應觸發第二次 AI 呼叫').toBe(1);
    expect(結果.documentText).toContain('事實清楚');
    expect(containsSimplifiedChinese(結果.documentText)).toBe(false);
  });

  it('轉換後的內容與原文等價，只換用字', async () => {
    const { 管線 } = 建管線([簡體]);
    const 結果 = await 執行(管線);
    // 除用字外不應改動內容
    expect(結果.documentText).toBe('原告請求被告返還借款，事實清楚，證據充足。');
  });

  it('產出本來就是繁體時不得更動，也不得多呼叫一次', async () => {
    const { 管線, 呼叫次數 } = 建管線([繁體]);
    const 結果 = await 執行(管線);
    expect(結果.documentText).toBe(繁體);
    expect(呼叫次數()).toBe(1);
  });

  it('停用轉換時仍必須 fail-closed', async () => {
    // 轉換是修正手段，不是放寬安全閘門。
    // 停用時簡體產出照樣不得交付。
    const { 管線, 呼叫次數 } = 建管線([簡體]);
    let 擲出: Error | null = null;
    try {
      await 執行(管線, false);
    } catch (e) {
      擲出 = e as Error;
    }
    expect(擲出, '停用轉換後簡體中文必須阻擋交付').not.toBeNull();
    expect(String(擲出?.message)).toMatch(/簡體|繁體/);
    expect(呼叫次數(), '停用後不得重新生成').toBe(1);
  });

  it('轉換與偵測共用同一份對照表，因此轉換後不可能殘留', () => {
    // 這是「轉換取代重新生成」仍能維持 fail-closed 的關鍵：
    // 偵測（containsSimplifiedChinese）與轉換（toTraditionalChinese）
    // 讀的是同一張 SIMPLIFIED_ONLY 表，因此只要偵測得到，就一定轉換得掉。
    // 閘門沒有因為改成轉換而鬆動。
    const 樣本 = [
      '事实清楚', '证据充足', '诉讼', '赔偿', '担保',
      '应该', '经过', '针对', '这个', '现在', '现场', '阅读',
    ];
    for (const 片段 of 樣本) {
      expect(containsSimplifiedChinese(片段), `${片段} 未被偵測為簡體`).toBe(true);
      expect(
        containsSimplifiedChinese(toTraditionalChinese(片段)),
        `${片段} 轉換後仍有殘留`,
      ).toBe(false);
    }
  });
});
