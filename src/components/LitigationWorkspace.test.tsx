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

describe('LitigationWorkspace', () => {
  it('uses the legal guide as the workspace starting point', () => {
    render(<ToolProvider><LitigationWorkspace /></ToolProvider>);

    expect(screen.getByText('非法律專業專用 · 生活法律導診')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /實用法務與書狀/ }));
    expect(screen.getByText('法律工具箱')).toBeInTheDocument();
  });
});
