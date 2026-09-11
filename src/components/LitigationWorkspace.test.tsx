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
    fireEvent.click(screen.getByRole('button', { name: /實用法務與書狀/ }));
    expect(await screen.findByText('法律工具箱')).toBeInTheDocument();
  });

  it('renders appeal analysis as a separate workspace', async () => {
    render(<ToolProvider><LitigationWorkspace initialTab="appeal" appealOnly /></ToolProvider>);

    expect(screen.getAllByText('判決分析與上訴狀').length).toBeGreaterThan(0);
    expect(screen.getByText('匯入裁判書分析原審違誤，並試算上訴法定期間')).toBeInTheDocument();
    expect(await screen.findByText('判決分析工具')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /生活法律導診/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /實用法務與書狀/ })).not.toBeInTheDocument();
  });
});
