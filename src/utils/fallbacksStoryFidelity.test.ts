import { describe, it, expect } from 'vitest';
import { buildFallbackJudgmentAnalysis } from './fallbacks';

/**
 * 本機規則備援不得產出與案件不符的敘事。
 *
 * 實測：對租賃清償判決與虛偽標示刑事判決分別執行提煉，產出的故事化文字
 * 一字不差，且都是性侵害式敘述（「侵害法益」「身心創傷」「被害人指控」），
 * 與租賃案件完全無關。畫面卻標示「✓ 智慧剖析完成」，
 * 使用者會誤以為那就是自己案件的內容。
 */
describe('本機備援的案件事實故事', () => {
  const leaseJudgment = `臺灣高雄地方法院民事判決　112年度訴字第4567號
原告甲○○主張：被告乙○○於民國110年4月20日與原告簽訂租賃契約，約定每月租金新臺幣25,000元。惟自民國111年7月起，被告拒不支付租金，經原告多次催告，被告仍不給付。
事實
原告已依約交付房屋並經被告確認無誤。被告則以房屋漏水未修為由拒絕支付。
理由
依民法第343條及租賃契約約定，被告負有支付租金之義務。經計算應給付175,000元。
判決主文
被告乙○○應給付原告甲○○新臺幣175,000元。`;

  it('民事案件不得出現人身侵害或身心創傷的敘述', () => {
    const r = buildFallbackJudgmentAnalysis(leaseJudgment);
    const story = r.judgmentSummary.storyNarrative;
    expect(story).not.toMatch(/侵害法益|身心受到實質創傷|身心創傷|痛苦地指控/);
  });

  it('民事案件的故事不得把當事人稱為被害人', () => {
    const r = buildFallbackJudgmentAnalysis(leaseJudgment);
    expect(r.judgmentSummary.storyNarrative).not.toContain('被害人');
  });

  it('必須誠實標示為本機備援範本', () => {
    const r = buildFallbackJudgmentAnalysis(leaseJudgment);
    expect(r.isLocalFallback).toBe(true);
    expect(r.fallbackNotice).toContain('固定範本');
  });

  it('刑事案件仍應保留原有的侵害型敘述', () => {
    const criminal = `臺灣臺北地方法院刑事判決　113年度訴字第1234號
被害人丙○○於112年5月10日向法院指訴被告丁○○犯傷害罪。
事實
被害人丙○○於112年5月10日遭被告丁○○毆傷。
理由
被告於警詢及偵查中否認犯行。
判決主文
被告丁○○犯傷害罪，處有期徒刑三個月。`;
    const r = buildFallbackJudgmentAnalysis(criminal);
    expect(r.caseType).toBe('criminal');
    expect(r.judgmentSummary.storyNarrative).toMatch(/侵害法益|身心/);
  });
});
