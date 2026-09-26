import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedEntry } from './UnifiedEntry';
import { fetchWithAuth } from '../lib/apiClient';
import { createInitialWorkflowState } from '../lib/workflow/unifiedStateGraph';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';
import { ToolProvider } from '../contexts/ToolContext';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';

// Mock apiClient fetchWithAuth
vi.mock('../lib/apiClient', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({})
  })
}));

describe('UnifiedEntry component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaseStore.getState().resetCase();
  });

  const renderComponent = () => {
    return render(
      <GlobalUIProvider><ToolProvider>
        <UnifiedEntry />
      </ToolProvider></GlobalUIProvider>
    );
  };

  it('renders a facts-only analysis input without judgment upload controls', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: '智慧案件分析工作台' })).toBeInTheDocument();
    expect(screen.getByText('案件事實描述')).toBeInTheDocument();
    expect(screen.getByText(/輸入口語案情，系統會先追問關鍵事實/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始分析' })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/上傳裁判書/)).not.toBeInTheDocument();
  });

  it('loads colloquial fact sample into textarea when selected', () => {
    renderComponent();

    fireEvent.change(screen.getByRole('combobox', { name: '載入範例案件' }), {
      target: { value: '4' },
    });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('我上個月在蝦皮買了一台二手筆電');
    expect(textarea.value).toContain('我現在該怎麼告他詐欺或要回錢？');
  });

  it('clears the canonical case immediately when opening a new case', async () => {
    const workflowState = createInitialWorkflowState('既有案件事實');
    workflowState.inputType = 'facts';
    workflowState.currentStep = 'COMPLETED';
    workflowState.router = {
      domain: '民事',
      chapter: '債編',
      cause: '借貸關係',
      is_sensitive: false,
      is_complete: true,
      missing_elements: []
    };
    workflowState.syllogism = {
      majorPremise: '借貸契約成立之法律要件',
      minorPremise: '既有案件事實',
      subsumption: '要件比對',
      conclusion: '應保全借貸及還款證據',
      fullAnalysis: '既有案件分析'
    };
    workflowState.verification = {
      totalChecked: 0,
      ghostCount: 0,
      results: [],
      sanitizedText: '既有案件分析',
      passGate: true,
      verificationStatus: 'PASS'
    };
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: workflowState })
    } as Response);

    renderComponent();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '既有案件事實' } });
    fireEvent.click(screen.getByRole('button', { name: '開始分析' }));
    const newCaseButton = await screen.findByRole('button', { name: '開立新案件' });

    useCaseStore.getState().updateIssues([{ id: 'old-issue', title: '舊爭點', originalHolding: '', appealArgument: '' }]);
    useCaseStore.getState().updateEvidences([{ id: 'old-evidence', code: '1', relatedIssue: '舊爭點', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' }]);
    fireEvent.click(newCaseButton);

    const freshCase = getActiveCase(useCaseStore.getState());
    expect(freshCase.facts).toBe('');
    expect(freshCase.workflowStateId).toBeUndefined();
    expect(freshCase.workflowStage).toBe('INGEST');
    expect(freshCase.issues).toEqual([]);
    expect(freshCase.evidences).toEqual([]);
  });

});
