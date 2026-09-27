import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, findByText } from '@testing-library/react';
import { saveCrossFeatureContext, clearCrossFeatureContext } from '../lib/crossFeatureContext';
import { LitigationWorkspace } from './LitigationWorkspace';

/**
 * 跨功能資料必須逐欄位回退。
 *
 * 實測：使用者完成統一入口分析後切到爭點與證據清單，仍顯示「共 0 爭點」。
 *
 * 根因：canUseCrossContext 是整份上下文的開關——只要存在任何 handoff
 * 就完全不看 cross_feature_context，連 handoff 自己沒帶的欄位也拿不到。
 * 發布端有寫入，但消費端讀不到，等於功能不存在。
 *
 * 安全邊界：只預填使用者自己輸入的案情。
 * issuesSummary 會把生成的法律主張放進要提交法院的書狀，維持不由系統預填。
 */
describe('跨功能資料的逐欄位回退', () => {
  beforeEach(() => {
    clearCrossFeatureContext();
  });

  afterEach(() => {
    clearCrossFeatureContext();
  });

  it('handoff 未帶案情時，應由跨功能脈絡補上', async () => {
    saveCrossFeatureContext({ facts: '房東未退還押金新臺幣五萬元' });
    // handoff 只帶了工具代碼，沒有帶 facts：這種情況下 facts 必須有回退來源
    render(
      <LitigationWorkspace
        root="litigation"
        section="issues"
        handoff={{ toolId: 'PAYMENT_ORDER_PETITION' }}
      />
    );
    // 爭點清單以 React.lazy 載入，需等待 Suspense 完成
    expect(await screen.findByText(/共 1 爭點/, {}, { timeout: 5000 })).toBeTruthy();
  });

  it('issuesSummary 不得由跨功能脈絡帶入法院書狀', async () => {
    // 爭點整理表是要提交法院的書狀，預填生成的法律主張等於替使用者預設立場
    saveCrossFeatureContext({ facts: '房東未退還押金', issuesSummary: 'AI 生成的爭點主張' });
    render(<LitigationWorkspace root="litigation" section="issues" />);
    await screen.findByText(/共 1 爭點/, {}, { timeout: 5000 });
    // 爭點標題應是預設的「待確認爭點」，不得是 AI 生成的主張
    expect(screen.queryByText('AI 生成的爭點主張')).toBeNull();
    expect(document.body.textContent).toContain('待確認爭點');
  });
});
