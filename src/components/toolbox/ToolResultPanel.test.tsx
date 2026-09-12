import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToolResultPanel } from './ToolResultPanel';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';

describe('ToolResultPanel Export & Print Actions', () => {
  const mockTool = LEGAL_TOOLS[0];
  const mockResult = {
    title: '存證信函測試',
    documentText: '一、主旨：請求返還借款。\n二、說明：查台端向本人借款新台幣壹拾萬元整...',
    antiGhostVerification: {
      totalCitationsChecked: 2,
      ghostCitationsFound: 0,
      citations: []
    },
    complianceChecklist: [
      { rule: '法定管轄權檢核', passed: true, detail: '符合民事訴訟法第一條' }
    ]
  };

  it('renders Copy, TXT, Word, and A4 Print action buttons', () => {
    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    expect(screen.getByText('複製')).toBeDefined();
    expect(screen.getByText('TXT')).toBeDefined();
    expect(screen.getByText('Word')).toBeDefined();
    expect(screen.getByText('A4 列印')).toBeDefined();
  });

  it('triggers Word document download on Word button click', () => {
    // Mock URL.createObjectURL & revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    const wordBtn = screen.getByText('Word');
    fireEvent.click(wordBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('triggers A4 Print pop-up on A4 Print button click', () => {
    const printMock = vi.fn();
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const focusMock = vi.fn();

    vi.spyOn(window, 'open').mockImplementation(() => ({
      document: {
        write: writeMock,
        close: closeMock
      },
      focus: focusMock,
      print: printMock
    } as unknown as Window));

    render(
      <ToolResultPanel
        result={mockResult}
        currentTool={mockTool}
        isVerifyingAi={false}
        verifyNotice={null}
        onFullVerify={vi.fn()}
      />
    );

    const printBtn = screen.getByText('A4 列印');
    fireEvent.click(printBtn);

    expect(window.open).toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalled();
  });
});
