import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolResultPanel } from './ToolResultPanel';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';
import type { LegalToolboxResult } from '../../types';

/**
 * 工具箱結果面板的引用狀態必須反映實際查核結果。
 *
 * 實測：狀態旗標只看幽靈數量，導致「零引用」與「有引用但未查證」
 * 兩種情況都被說成「引用檢查未發現異常」。
 * 實測 借款催告存證信函 產出後共檢核 0 處引用，畫面卻顯示「未發現異常」。
 */
const currentTool = LEGAL_TOOLS.find(tool => tool.id === 'DEMAND_LETTER_DEBT')!;

const base: Omit<LegalToolboxResult, 'antiGhostVerification'> = {
  toolCategory: 'DEMAND_LETTER_DEBT',
  title: '借款催告存證信函',
  documentText: '請依約返還。',
  complianceChecklist: [],
  disclaimer: ''
};

const renderPanel = (antiGhostVerification: Record<string, unknown>) =>
  render(
    <ToolResultPanel
      result={{ ...base, antiGhostVerification } as unknown as LegalToolboxResult}
      currentTool={currentTool}
      isVerifyingAi={false}
      verifyNotice={null}
      onFullVerify={() => {}}
    />
  );

describe('工具箱引用狀態反映實際結果', () => {
  it('零引用時不得宣稱檢查未發現異常', () => {
    renderPanel({ totalCitationsChecked: 0, ghostCitationsFound: 0, verifiedCitations: [] });
    expect(screen.queryByText('引用檢查未發現異常')).toBeNull();
    expect(screen.getByText(/未引用法條或裁判/)).toBeTruthy();
  });

  it('有幽靈引用時顯示疑似無效引用', () => {
    renderPanel({ totalCitationsChecked: 3, ghostCitationsFound: 1, verifiedCitations: [] });
    expect(screen.getByText('疑似無效引用')).toBeTruthy();
  });

  it('有引用但未查證時必須提示人工確認，不得宣稱未發現異常', () => {
    renderPanel({
      totalCitationsChecked: 2,
      ghostCitationsFound: 0,
      verifiedCitations: [{ citationText: '民法第9999條', verified: false }]
    });
    expect(screen.queryByText('引用檢查未發現異常')).toBeNull();
    expect(screen.getByText(/尚未查證/)).toBeTruthy();
  });

  it('全部驗證通過時才顯示未發現異常', () => {
    renderPanel({
      totalCitationsChecked: 2,
      ghostCitationsFound: 0,
      verifiedCitations: [
        { citationText: '民法第474條', verified: true },
        { citationText: '票據法第120條', verified: true }
      ]
    });
    expect(screen.getByText('引用檢查未發現異常')).toBeTruthy();
  });
});
