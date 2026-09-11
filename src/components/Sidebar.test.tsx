import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolProvider } from '../contexts/ToolContext';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('shows four task-oriented entries in the requested order', () => {
    render(<ToolProvider><Sidebar /></ToolProvider>);
    const labels = ['智慧案件分析工作台', '判決分析與上訴狀', '全方位實用法務工具箱', '法律工具台'];
    const entries = labels.map(label => screen.getByText(label));

    expect(entries.every((entry, index) => index === 0 || Boolean(entries[index - 1].compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(screen.getByText(/幽靈法條與假判決精準攔截 · 支援 PDF/)).toBeInTheDocument();
  });
});
