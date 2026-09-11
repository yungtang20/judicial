import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolProvider, useToolContext } from '../contexts/ToolContext';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('shows four task-oriented entries in the requested order', () => {
    render(<ToolProvider><Sidebar /></ToolProvider>);
    const labels = ['智慧案件分析工作台', '智慧判決分析工作台', '全方位實用法務工具箱', '法律工具台'];
    const entries = labels.map(label => screen.getByText(label));

    expect(entries.every((entry, index) => index === 0 || Boolean(entries[index - 1].compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(screen.getByText(/幽靈法條與假判決精準攔截 · 支援 PDF/)).toBeInTheDocument();
  });

  it('shows workspace sections in the sidebar and routes the selected section', () => {
    const Selection = () => {
      const { activeTool, initialData } = useToolContext();
      return <output>{activeTool}:{initialData?.initialTab || ''}</output>;
    };
    render(<ToolProvider><Sidebar /><Selection /></ToolProvider>);
    const labels = ['上訴法定期間試算', '判決分析與上訴狀', '雙軌訴訟防禦', '爭點與證據清單'];
    const entries = labels.map(label => screen.getByRole('button', { name: new RegExp(label) }));

    expect(entries.every((entry, index) => index === 0 || Boolean(entries[index - 1].compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    fireEvent.click(entries[2]);
    expect(screen.getByText('appeal:defense')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /書狀與法律文件製作/ }));
    expect(screen.getByText('litigation:toolbox')).toBeInTheDocument();
  });
});
