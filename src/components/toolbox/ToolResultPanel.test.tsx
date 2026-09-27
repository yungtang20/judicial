import { beforeAll, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToolResultPanel } from './ToolResultPanel';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';
import type { PleadingDeliveryAuthorization } from '../../lib/finalGate/pleadingExportGate';
import { fingerprintReviewPayload } from '../../lib/reviewer/pleadingReviewer';

describe('ToolResultPanel Export & Print Actions', () => {
  const mockTool = LEGAL_TOOLS[0];
  // 列印成功路徑必須用非 P9 工具。mockTool 是 JUDICIAL_CIVIL_TEMPLATE（requiresP9=true），
  // 其交付判定本來就是拒絕（documentFingerprint 不符）。
  // 舊的列印測試之所以「通過」，是因為守衛在開窗之前就拋錯、而失敗被靜默吞掉，
  // 等於斷言了一次不會發生的成功。
  const mockPrintTool = LEGAL_TOOLS.find(tool => tool.id === 'UNIVERSAL_AI_PLEADING')!;
  const readyAuthorization: PleadingDeliveryAuthorization = {
    finalGateStatus: 'READY',
    exportPolicy: 'READY_ONLY',
    evaluatorVersion: '1.0.0',
    gateInputFingerprint: 'a'.repeat(64),
    documentFingerprint: '',
    caseInputId: 'case-1',
    draftId: 'draft-1',
    ruleProfileId: 'profile-1',
    ruleProfileVersion: '1.0.0',
    authorizedActions: ['RETURN', 'COPY', 'DOWNLOAD_TEXT', 'DOWNLOAD_WORD', 'PRINT']
  };
  const mockResult = {
    // 夾具必須完整符合 LegalToolboxResult：先前缺少 toolCategory 與 disclaimer，
    // 在沒有 React 型別定義時不會被發現。
    toolCategory: 'DEBT',
    disclaimer: '本文件僅供參考，重要事項請諮詢專業律師。',
    title: '存證信函測試',
    documentText: '一、主旨：請求返還借款。\n二、說明：查台端向本人借款新台幣壹拾萬元整...',
    antiGhostVerification: {
      // 必須帶明確 status：過往夾具缺少此欄位，會讓人工覆核閘門把「未查核」誤讀為「已通過」。
      status: 'VERIFIED' as const,
      totalCitationsChecked: 2,
      ghostCitationsFound: 0,
      verifiedCitations: []
    },
    complianceChecklist: [
      { rule: '法定管轄權檢核', passed: true, detail: '符合民事訴訟法第一條' }
    ],
    pleadingDeliveryAuthorization: readyAuthorization
  };

  beforeAll(async () => {
    readyAuthorization.documentFingerprint = await fingerprintReviewPayload(mockResult.documentText);
  });

  it('hides court pleading text and every export action without P9 authorization', () => {
    const ungatedResult = { ...mockResult, pleadingDeliveryAuthorization: undefined };
    render(
      <ToolResultPanel
        result={ungatedResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('P9_FINAL_GATE_REQUIRED');
    expect(screen.queryByText(ungatedResult.documentText)).toBeNull();
    expect(screen.queryByText('複製')).toBeNull();
    expect(screen.queryByText('TXT')).toBeNull();
    expect(screen.queryByText('Word')).toBeNull();
    expect(screen.queryByText('A4 列印')).toBeNull();
  });

  it('blocks every export action while the citation verification is still unproven', async () => {
    const pendingResult = {
      ...mockResult,
      // canonical 管線產製時尚未執行外部查核，status 為 UNVERIFIED
      antiGhostVerification: {
        status: 'UNVERIFIED' as const,
        totalCitationsChecked: 0,
        ghostCitationsFound: 0,
        verifiedCitations: []
      }
    };
    render(
      <ToolResultPanel
        result={pendingResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    // 擋下狀態：正文與匯出按鈕不可用，且必須提供人工複核入口才能解鎖
    expect(await screen.findByRole('button', { name: '已完成人工複核' })).toBeInTheDocument();
    for (const name of ['複製', 'TXT', 'Word', 'A4 列印']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('renders Copy, TXT, Word, and A4 Print action buttons', async () => {
    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    expect(await screen.findByText('複製')).toBeDefined();
    expect(screen.getByText('TXT')).toBeDefined();
    expect(screen.getByText('Word')).toBeDefined();
    expect(screen.getByText('A4 列印')).toBeDefined();
  });

  it('does not describe anti-ghost verification as legal compliance', async () => {
    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    expect(await screen.findByText('引用檢查未發現異常')).toBeDefined();
    expect(screen.getByText(/不等同法律合規/)).toBeDefined();
    expect(screen.queryByText('法規檢驗通過')).toBeNull();
  });

  it('triggers Word document download on Word button click', async () => {
    // Mock URL.createObjectURL & revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    const wordBtn = await screen.findByText('Word');
    fireEvent.click(wordBtn);

    await vi.waitFor(() => expect(createObjectURLMock).toHaveBeenCalled());
  });

  it('triggers A4 Print pop-up on A4 Print button click', async () => {
    const printMock = vi.fn();
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const focusMock = vi.fn();

    const openMock = vi.fn(() => ({
      document: {
        write: writeMock,
        close: closeMock
      },
      focus: focusMock,
      print: printMock,
      close: closeMock
    } as unknown as Window));
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    render(
      <ToolResultPanel
        result={{ ...mockResult, pleadingDeliveryAuthorization: undefined }}
        currentTool={mockPrintTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    const printBtn = await screen.findByText('A4 列印');
    fireEvent.click(printBtn);

    // 視窗先同步開啟、寫入在交付檢核之後的 microtask 執行，因此需等待
    await vi.waitFor(() => expect(openMock).toHaveBeenCalled());
    await vi.waitFor(() => expect(writeMock).toHaveBeenCalled());
  });

  it('blocks a READY authorization replayed against modified document text', async () => {
    const props = {
      currentTool: mockTool,
      isVerifyingAi: false,
      verifyNotice: null,
      onFullVerify: vi.fn()
    };
    const { rerender } = render(
      <ToolResultPanel
        result={mockResult}
        {...props}
      />
    );
    expect(await screen.findByText('複製')).toBeDefined();

    const tamperedText = `${mockResult.documentText}\n遭篡改`;
    rerender(<ToolResultPanel result={{ ...mockResult, documentText: tamperedText }} {...props} />);

    // A result change must close immediately; it must not inherit the previous
    // render's ALLOWED state while its fingerprint is being checked.
    expect(screen.queryByText('複製')).toBeNull();
    expect(screen.queryByText(tamperedText)).toBeNull();
    expect(await screen.findByText('法院書狀交付已封鎖')).toBeDefined();
    expect(screen.queryByText('Word')).toBeNull();
    expect(screen.queryByText('A4 列印')).toBeNull();
  });
});
