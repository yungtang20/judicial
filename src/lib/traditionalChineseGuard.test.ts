import { describe, it, expect } from 'vitest';
import { containsSimplifiedChinese, findSimplifiedChinese, describeSimplifiedChinese } from './traditionalChineseGuard';
import { verifyGeneratedDocument } from './generatedDocumentPipeline';
import { buildRouterPrompt, buildQuestioningPrompt, buildSyllogismEnginePrompt } from '../prompts/legalProcessPrompts';
import { getBPointTriagePrompt, getMineScanPrompt } from '../prompts/defense-workflow';
import { getRefinePrompt } from './generation/draftRefiner';

/**
 * 繁體中文用字防線。
 *
 * 實測曾出現補充事實選項為簡體中文「已签书面合同并有转账记录」，
 * 該文字會被併入案件事實，並進一步帶入產製的法律書狀。
 */
describe('繁體中文用字檢查', () => {
  it('偵測出簡體特徵字', () => {
    const hits = findSimplifiedChinese('已签书面合同并有转账记录');
    expect(hits.map(h => h.simplified)).toEqual(expect.arrayContaining(['签', '书', '转', '账', '记', '录']));
  });

  it('繁體中文不誤判', () => {
    expect(containsSimplifiedChinese('我被房東扣住五萬元押金不還，屢催不果。')).toBe(false);
    expect(containsSimplifiedChinese('請求返還押金並給付遲延利息')).toBe(false);
  });

  it('繁簡同形字不誤判', () => {
    // 「台」在台灣地名中本就是常用寫法，不應被判定為簡體
    expect(containsSimplifiedChinese('臺北市中山區')).toBe(false);
    expect(containsSimplifiedChinese('法院')).toBe(false);
  });

  it('錯誤訊息指出應改為何字', () => {
    const msg = describeSimplifiedChinese('產製文件', '已签书面合同');
    expect(msg).toContain('簽');
    expect(msg).toContain('書');
    expect(msg).toContain('已阻擋交付');
  });

  it('交付前阻擋含簡體中文的法律文件', () => {
    expect(() => verifyGeneratedDocument('請依民法第479條規定償還借款，已签书面合同。'))
      .toThrow(/簡體中文/);
  });

  it('繁體中文文件不受影響，仍照常通過引用檢核', () => {
    const result = verifyGeneratedDocument('請依民法第479條規定返還借款本息。');
    expect(result.documentText).toContain('民法第479條');
  });
});

describe('提示詞層強制繁體中文', () => {
  it('三個節點的提示詞都要求繁體中文', () => {
    expect(buildRouterPrompt('案情')).toContain('繁體中文');
    expect(buildQuestioningPrompt(['缺少時間'], '案情')).toContain('繁體中文');
    expect(buildSyllogismEnginePrompt('民法第479條', '借方未還款')).toContain('繁體中文');
  });
});

describe('所有 AI 產出入口都必須要求繁體中文', () => {
  it('工作流三節點提示詞', () => {
    expect(buildRouterPrompt('案情')).toContain('繁體中文');
    expect(buildQuestioningPrompt(['缺少時間'], '案情')).toContain('繁體中文');
    expect(buildSyllogismEnginePrompt('民法第479條', '借方未還款')).toContain('繁體中文');
  });

  it('草稿精修提示詞：漏掉會讓精修恆定失敗（實測產出含「费」等簡體字被交付閘門擋下）', () => {
    const prompt = getRefinePrompt('原草稿', '改得更正式', []);
    expect(prompt).toContain('繁體中文');
    expect(prompt).toContain('不得轉為簡體中文');
  });

  it('防線工作流的三個提示詞', () => {
    expect(getBPointTriagePrompt('案情')).toContain('繁體中文');
    expect(getMineScanPrompt('案情')).toContain('繁體中文');
  });
});
