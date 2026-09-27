import { describe, it, expect, beforeEach } from 'vitest';
import { saveCrossFeatureContext, loadCrossFeatureContext, clearCrossFeatureContext } from './crossFeatureContext';

/**
 * 分析完成後，跨功能脈絡只能帶入使用者自己的輸入。
 *
 * 實測：統一入口完成分析後，下游的爭點與證據清單仍是「共 0 爭點」，
 * 使用者得逐頁重打同一段事實。
 *
 * 但預填有風險：其中一頁是要提交法院的書狀，
 * 若把 AI 生成的法律主張預填進去，等於替使用者預設法律立場。
 * 因此只發布使用者原始輸入，不發布任何生成內容。
 */
describe('跨功能脈絡的發布內容', () => {
  beforeEach(() => {
    clearCrossFeatureContext();
  });

  it('facts 是使用者輸入，必須能被下游讀取', () => {
    saveCrossFeatureContext({ facts: '房東未退還押金新臺幣五萬元' });
    expect(loadCrossFeatureContext()?.facts).toBe('房東未退還押金新臺幣五萬元');
  });

  it('未提供 issuesSummary 時下游不會預填爭點', () => {
    saveCrossFeatureContext({ facts: '房東未退還押金' });
    const ctx = loadCrossFeatureContext();
    // 爭點與證據清單會用 issuesSummary 預填第一列；
    // 沒有它就必須讓使用者自己填，而不是塞入生成內容
    expect(ctx?.issuesSummary).toBeUndefined();
  });

  it('發布時不得夾帶任何法律主張欄位', () => {
    saveCrossFeatureContext({
      facts: '房東未退還押金',
      domain: '民事',
      cause: '租賃契約糾紛'
    });
    const stored = JSON.parse(localStorage.getItem('cross_feature_context') || '{}');
    // 這三個欄位是使用者輸入與分類標籤；
    // issuesSummary 會預填法院書狀的爭點，必須由使用者自己填。
    expect(stored.facts).toBe('房東未退還押金');
    expect(stored).not.toHaveProperty('preselectedToolId');
    expect(stored).not.toHaveProperty('caseNumber');
    expect(stored).not.toHaveProperty('partyName');
  });
});
