import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('列印路徑', () => {
  it('彈出視窗被攔截時必須提示使用者，不得靜默無反應', async () => {
    const originalOpen = window.open;
    // 模擬瀏覽器攔截彈出視窗
    window.open = () => null;
    try {
      renderPanel({ totalCitationsChecked: 0, ghostCitationsFound: 0, verifiedCitations: [] });
      fireEvent.click(screen.getByText('A4 列印'));
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('瀏覽器擋下了列印視窗');
      });
      // 必須告訴使用者替代做法
      expect(screen.getByRole('alert').textContent).toMatch(/TXT|Word/);
    } finally {
      window.open = originalOpen;
    }
  });
});

/**
 * 含待填欄位的書狀不得交付。
 *
 * 實測：模板在使用者未提供資料時會標記「（待填寫）」。
 * 若任其匯出，使用者可能把缺欄位的草稿當成完整書狀提交法院。
 * 這與專案既有的 P9 fail-closed 原則一致：未完成的東西不得交付。
 */
describe('未完成的書狀不得交付', () => {
  it('文件含待填標記時，匯出按鈕應被擋下並說明原因', async () => {
    render(
      <ToolResultPanel
        result={{
          ...base,
          documentText: '刑事告訴狀\n告訴人：\n事發經過：（待填寫）'
        } as unknown as LegalToolboxResult}
        currentTool={currentTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={() => {}}
      />
    );
    // 畫面上必須明確告知文件尚未完成
    expect(screen.getByText(/尚有欄位未填寫/)).toBeTruthy();
    // 點擊 TXT 匯出不得產生下載
    const created: Blob[] = [];
    const original = URL.createObjectURL;
    URL.createObjectURL = (blob: Blob) => { created.push(blob); return original.call(URL, blob); };
    try {
      fireEvent.click(document.getElementById('btn-download-txt')!);
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toMatch(/未填寫/);
      });
      expect(created.length).toBe(0);
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('文件不含待填標記時，匯出照常進行', async () => {
    render(
      <ToolResultPanel
        result={{ ...base, documentText: '民事起訴狀\n原告：王大明\n被告：李四龍' } as unknown as LegalToolboxResult}
        currentTool={currentTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={() => {}}
      />
    );
    const created: Blob[] = [];
    const original = URL.createObjectURL;
    URL.createObjectURL = (blob: Blob) => { created.push(blob); return original.call(URL, blob); };
    try {
      fireEvent.click(document.getElementById('btn-download-txt')!);
      await waitFor(() => expect(created.length).toBe(1));
    } finally {
      URL.createObjectURL = original;
    }
  });
});
