import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolProvider } from '../contexts/ToolContext';
import { LitigationWorkspace } from './LitigationWorkspace';

vi.mock('./SmartAppealAssistant', () => ({ default: () => <div>判決分析工具</div> }));
vi.mock('./DefenseWorkflowTool', () => ({ DefenseWorkflowTool: () => <div>訴訟防禦工具</div> }));
vi.mock('./IssueTableGenerator', () => ({ default: () => <div>爭點工具</div> }));
vi.mock('./EvidenceListGenerator', () => ({ default: () => <div>證據工具</div> }));
vi.mock('./AppealDeadlineTool', () => ({ default: () => <div>期限工具</div> }));
vi.mock('./LegalToolbox', () => ({ LegalToolbox: () => <div>法律工具箱</div> }));
vi.mock('./LegalGuideHome', () => ({ LegalGuideHome: () => <div>非法律專業專用 · 生活法律導診</div> }));

describe('LitigationWorkspace', () => {
  it('uses the legal guide as the workspace starting point', async () => {
    render(<ToolProvider><LitigationWorkspace /></ToolProvider>);

    expect(await screen.findByText('非法律專業專用 · 生活法律導診')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /生活法律導診與實用法務/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^實用法務與書狀/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /雙軌訴訟防禦/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /爭點與證據清單/ })).not.toBeInTheDocument();
  });

  it('keeps direct access to a selected document tool inside the combined entry', async () => {
    render(<ToolProvider><LitigationWorkspace initialTab="toolbox" /></ToolProvider>);

    expect(await screen.findByText('法律工具箱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /生活法律導診與實用法務/ })).toBeInTheDocument();
  });

  it('groups the four judgment-analysis tools in the requested order', async () => {
    render(<ToolProvider><LitigationWorkspace initialTab="appeal" appealOnly /></ToolProvider>);

    expect(screen.getByText('智慧判決分析工作台')).toBeInTheDocument();
    expect(screen.getByText('整合期限試算、判決剖析、訴訟防禦與爭點證據')).toBeInTheDocument();
    expect(await screen.findByText('判決分析工具')).toBeInTheDocument();
    const labels = ['上訴法定期間試算', '判決分析與上訴狀', '雙軌訴訟防禦', '爭點與證據清單'];
    const tabs = labels.map(label => screen.getByRole('button', { name: new RegExp(label) }));
    expect(tabs.every((tab, index) => index === 0 || Boolean(tabs[index - 1].compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    fireEvent.click(tabs[0]);
    expect(await screen.findByText('期限工具')).toBeInTheDocument();
    fireEvent.click(tabs[2]);
    expect(await screen.findByText('訴訟防禦工具')).toBeInTheDocument();
    fireEvent.click(tabs[3]);
    expect(await screen.findByText('爭點工具')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /生活法律導診/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /實用法務與書狀/ })).not.toBeInTheDocument();
  });
});
