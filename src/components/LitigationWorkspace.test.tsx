import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolProvider } from '../contexts/ToolContext';
import { LitigationWorkspace } from './LitigationWorkspace';

vi.mock('./SmartAppealAssistant', () => ({ default: () => <div>判決分析工具</div> }));
vi.mock('./DefenseWorkflowTool', () => ({ DefenseWorkflowTool: () => <div>訴訟防禦工具</div> }));
vi.mock('./IssueTableGenerator', () => ({ default: () => <div>爭點工具</div> }));
vi.mock('./EvidenceListGenerator', () => ({ default: ({ initialIssueSummary }: { initialIssueSummary?: string }) => <div>證據工具：{initialIssueSummary || '待確認爭點'}</div> }));
vi.mock('./AppealDeadlineTool', () => ({ default: () => <div>期限工具</div> }));
vi.mock('./LegalToolbox', () => ({ LegalToolbox: () => <div>法律工具箱</div> }));
vi.mock('./LegalGuideHome', () => ({ LegalGuideHome: () => <div>非法律專業專用 · 生活法律導診</div> }));

describe('LitigationWorkspace', () => {
  it('uses document drafting as the workspace starting point', async () => {
    render(<ToolProvider><LitigationWorkspace /></ToolProvider>);

    expect(await screen.findByText('法律工具箱')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /雙軌訴訟防禦/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /爭點與證據清單/ })).not.toBeInTheDocument();
  });

  it('keeps the legacy guide route separate from document drafting', async () => {
    render(<ToolProvider><LitigationWorkspace initialTab="guide" /></ToolProvider>);

    expect(await screen.findByText('非法律專業專用 · 生活法律導診')).toBeInTheDocument();
  });

  it.each([
    ['deadline', '期限工具'],
    ['appeal', '判決分析工具'],
    ['defense', '訴訟防禦工具'],
    ['issues', '爭點工具'],
  ] as const)('renders the %s section selected from the sidebar', async (initialTab, content) => {
    render(<ToolProvider><LitigationWorkspace initialTab={initialTab} appealOnly /></ToolProvider>);

    expect(screen.getByText('智慧判決分析工作台')).toBeInTheDocument();
    expect(await screen.findByText(content)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /上訴法定期間試算/ })).not.toBeInTheDocument();
  });

  it('does not use the complete facts narrative as an evidence issue', async () => {
    const facts = '原告主張被告於某日借款，但未提出完整收據及雙方對話紀錄。';
    render(<ToolProvider><LitigationWorkspace initialTab="evidence" handoff={{ facts }} /></ToolProvider>);

    expect(await screen.findByText('證據工具：待確認爭點')).toBeInTheDocument();
    expect(screen.queryByText(facts)).not.toBeInTheDocument();
  });

  it('passes the handoff issue summary as the evidence issue seed', async () => {
    render(<ToolProvider><LitigationWorkspace initialTab="evidence" handoff={{ facts: '完整案件敘事', issuesSummary: '借貸關係是否成立' }} /></ToolProvider>);

    expect(await screen.findByText('證據工具：借貸關係是否成立')).toBeInTheDocument();
  });
});
