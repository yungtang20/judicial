// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getAnalyzeJudgmentPrompt } from '../../src/prompts/analyze-judgment.js';

/**
 * 判決分析提示詞必須明確禁止捏造裁判字號。
 *
 * 正式站實測：提示詞通篇要求「法庭紀實故事」「像一部電影」，
 * 完全沒有提到引用。模型為了讓敘事顯得權威而杜撰字號
 * （實測產生「最高法院 49 年台上字第 456 號 民事判例」、
 * 「最高法院 108 年度台上大字第 1884 號」），防護閘門正確攔下，
 * 但整份分析作廢——該功能實際上每次都產不出結果。
 *
 * 提示詞的敘事要求是捏造的成因，因此在提示詞中明確禁止，
 * 才是治本；在介面端放寬閘門則會違反 fail-closed 原則。
 */
describe('判決分析提示詞的引用要求', () => {
  const 提示 = getAnalyzeJudgmentPrompt('測試判決書內容', undefined, 'civil');

  it('必須明確禁止捏造裁判字號', () => {
    expect(提示).toMatch(/絕對不可/);
    expect(提示, '未禁止捏造裁判字號').toMatch(/未在.*裁判書原文.*出現過/);
  });

  it('必須說明系統會逐字比對字號', () => {
    expect(提示, '未說明字號會被檢核').toMatch(/比對|檢核|查證/);
    expect(提示, '未說明不合格的後果').toMatch(/退回範本|不合格/);
  });

  it('無可引用見解時應指示完全不要出現字號', () => {
    expect(提示).toMatch(/不要.*任何裁判字號|完全不要/);
  });

  it('必須保留原有的繁體中文要求', () => {
    expect(提示, '繁體中文要求被移除').toMatch(/繁體中文/);
  });

  it('必須保留故事化敘事要求（這是產品既定功能）', () => {
    expect(提示, '故事化要求被移除').toMatch(/說故事|故事/);
  });

  it('引用限制不得取代原有的格式要求', () => {
    expect(提示).toMatch(/mainHolding/);
    expect(提示).toMatch(/caseType/);
  });
});
