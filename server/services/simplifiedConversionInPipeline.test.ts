import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LegalGenerationPipeline } from './legalGenerationPipeline';
import { containsSimplifiedChinese } from '../../src/lib/traditionalChineseGuard';

/**
 * 簡體產出必須靠轉換修正，不得要求模型重新生成。
 *
 * 先前處方式是「要求模型改用繁體重新生成」——那是一次完整的 AI 呼叫，
 * 等於把已花掉的 20~40 秒再花一次，而且不保證成功：
 * 實測 analyze-judgment 5 次呼叫仍有 1 次因簡體被擋（SIMPLIFIED_OUTPUT）。
 *
 * 改為確定性轉換後：
 * - 不再多花一次上游呼叫
 * - 結果確定，不受模型運氣影響
 * - 轉換後若仍有殘留（對照表未涵蓋），繁體閘門仍會 fail-closed
 */

function 建立檢索服務() {
  return {
    search: vi.fn().mockResolvedValue({ statutes: [], judgments: [], references: [], literature: [] }),
    retrieveContext: vi.fn().mockResolvedValue({
      promptBlock: '',
      sources: [],
      allowedCitations: [],
      isExternalRetrievalUsed: false,
    }),
  } as never;
}

describe('簡體產出的處理', () => {
  let generate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    generate = vi.fn();
  });

  const 跑管線 = () => {
    const 管線 = new LegalGenerationPipeline(建立檢索服務(), { generate } as never);
    return 管線.execute({
      ragQuery: '押金返還',
      buildPrompt: () => '請分析本案法律問題。',
    });
  };

  it('含簡體的產出會被轉換為繁體，且只呼叫一次 AI', async () => {
    generate.mockResolvedValue({
      text: '本案爭點在於債務是否成立。依民法第179條規定，請求返還押金新臺幣100,000元，並負擔遲延利息。',
    });

    const 結果 = await 跑管線();

    // 必須只有一次 AI 呼叫——轉換是本機做的，不需要再問模型
    expect(generate).toHaveBeenCalledTimes(1);
    expect(containsSimplifiedChinese(結果.documentText)).toBe(false);
  });

  it('已是繁體的產出不應被更動', async () => {
    const 原文 = '本案爭點在於債務是否成立。依民法第179條規定，請求返還押金。';
    generate.mockResolvedValue({ text: 原文 });

    const 結果 = await 跑管線();

    expect(generate).toHaveBeenCalledTimes(1);
    expect(結果.documentText).toContain(原文);
  });
});
