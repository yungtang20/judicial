import { describe, it, expect } from 'vitest';
import { buildFallbackJudgmentAnalysis } from './fallbacks';

/**
 * 判決書的當事人姓名擷取不得抓到散文。
 *
 * 實測：判決書常以「乙○○」遮蔽姓名，原先的正則
 * /(?:被告)\s*([\u4e00-\u9fa5]{2,4})/ 會跨過遮蔽符號抓到後面的散文，
 * 把「原告已依約支付價款，被告卻遲未交付」中的「卻遲未交」當成被告姓名，
 * 直接出現在產出的故事裡。
 */
describe('判決書當事人姓名擷取', () => {
  const storyOf = (text: string) => buildFallbackJudgmentAnalysis(text).judgmentSummary.storyNarrative;

  it('姓名被遮蔽時不得把散文當成姓名', () => {
    const text = `臺灣臺北地方法院民事判決　112年度訴字第4567號
原告甲○○主張：被告乙○○於民國110年4月20日與原告簽訂買賣契約，約定價款新臺幣50,000元。原告已依約支付價款，被告卻遲未交付。經原告多次催告，被告仍不交付。
判決主文：被告乙○○應給付原告甲○○新臺幣50,000元。`;
    const story = storyOf(text);
    expect(story).not.toContain('卻遲未交');
    expect(story).not.toContain('遲未交');
    // 抓不到姓名時應使用中性稱呼
    expect(story).toContain('涉案當事人');
  });

  it('有真實姓名時必須正確擷取', () => {
    const text = `某地方法院民事判決
原告王大明主張：被告李四龍於民國110年4月20日與原告簽訂買賣契約，原告已依約支付價款。
判決主文：被告李四龍應給付原告王大明新臺幣50,000元。`;
    const story = storyOf(text);
    expect(story).toContain('李四龍');
  });

  it('姓名後接中文助詞時仍須正確擷取', () => {
    const text = `某地方法院民事判決
被告陳淑芬於民國110年3月1日與原告簽訂租賃契約，原告已支付押金。
判決主文：被告陳淑芬應返還原告押金。`;
    const story = storyOf(text);
    expect(story).toContain('陳淑芬');
  });

  it('四字姓名完整保留', () => {
    const text = `某地方法院民事判決
被告王小明祥於民國110年3月1日與原告簽訂契約。
判決主文：被告王小明祥應給付原告。`;
    const story = storyOf(text);
    expect(story).toContain('王小明祥');
  });
});
