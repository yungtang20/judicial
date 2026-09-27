// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { LegalGenerationPipeline } from './legalGenerationPipeline.js';
import { TRADITIONAL_CHINESE_REQUIREMENT } from '../../src/prompts/languageRequirements.js';

/**
 * 管線送給模型的每一份提示詞都必須帶入繁體中文要求。
 *
 * 實測：`promptBlock` 只含檢索內容與三段論規則，
 * 從未帶入 `TRADITIONAL_CHINESE_REQUIREMENT`——
 * 模型沒有被要求使用繁體，產出含簡體後被繁體閘門擋下，
 * 該功能恆定失敗。連「發現簡體後要求重生成」都救不回來，
 * 因為根本原因是提示詞從未提出這項要求。
 *
 * 語言要求必須由管線統一附加，不交給各呼叫端自行判斷——
 * 這正是 `languageRequirements.ts` 存在的理由。
 */
const 檢索服務 = {
  search: async () => ({ enabled: false, provider: 'none' as const, sources: [], allowedCitations: [] }),
  retrieveContext: async () => ({
    sources: { enabled: false, provider: 'none' as const, sources: [], allowedCitations: [] },
    promptBlock: '【檢索內容】',
    allowedCitations: [] as string[],
    literature: []
  })
};

const 執行一次 = async () => {
  const 收到的提示: string[] = [];
  const provider = {
    generate: vi.fn(async (prompt: string) => {
      收到的提示.push(prompt);
      return { text: '原告請求被告返還借款，事實清楚，證據充足。' };
    })
  };
  const 管線 = new LegalGenerationPipeline(檢索服務 as never, provider as never);
  await 管線.execute({
    buildPrompt: () => '請依下列事實撰寫書狀',
    parseResponse: (t: string) => ({ documentText: t })
  } as never);
  return 收到的提示;
};

describe('管線提示詞必須帶入繁體中文要求', () => {
  it('每一次 AI 呼叫的提示詞都必須含語言要求', async () => {
    const 提示 = await 執行一次();
    expect(提示.length).toBeGreaterThan(0);
    for (const p of 提示) {
      expect(p, '提示詞缺少繁體中文要求').toContain(TRADITIONAL_CHINESE_REQUIREMENT);
    }
  });

  it('語言要求必須明確標示為輸出要求', async () => {
    const 提示 = await 執行一次();
    expect(提示[0]).toContain('【輸出語言要求】');
  });

  it('停用三段論規則時語言要求仍須附加', async () => {
    const 提示: string[] = [];
    const provider = {
      generate: vi.fn(async (p: string) => { 提示.push(p); return { text: '事實清楚。' }; })
    };
    const 管線 = new LegalGenerationPipeline(檢索服務 as never, provider as never);
    await 管線.execute({
      buildPrompt: () => '提示',
      parseResponse: (t: string) => ({ documentText: t }),
      appendSyllogismRules: false
    } as never);
    expect(提示[0]).toContain(TRADITIONAL_CHINESE_REQUIREMENT);
  });
});
