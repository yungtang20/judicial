import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedEntry } from './UnifiedEntry';
import { fetchWithAuth } from '../lib/apiClient';
import { createInitialWorkflowState } from '../lib/workflow/unifiedStateGraph';
import { useCaseStore } from '../store/useCaseStore';
import { ToolProvider } from '../contexts/ToolContext';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';

vi.mock('../lib/apiClient', () => ({
  fetchWithAuth: vi.fn()
}));

const completedState = () => {
  const state = createInitialWorkflowState('房東拒不返還押金');
  state.currentStep = 'COMPLETED';
  state.router = {
    domain: '民事', chapter: '債', cause: '租賃', is_sensitive: false, is_complete: true, missing_elements: []
  };
  state.rag = {
    searchQuery: '租賃押金',
    legalElements: '租賃契約成立與押金返還之構成要件',
    statuteCitations: ['民法第184條', '民法第478條'],
    precedents: [{ caseNumber: '臺灣臺北地方法院 113 年度訴字第 1 號', courtName: '臺灣臺北地方法院', summary: '租賃押金爭議', citedStatutes: ['民法第184條'] }]
  };
  state.verification = {
    totalChecked: 3, ghostCount: 0, results: [], sanitizedText: '', passGate: true, verificationStatus: 'PASS'
  };
  state.syllogism = {
    majorPremise: '租賃押金返還請求權', minorPremise: '房東拒不返還押金',
    subsumption: '要件比對', conclusion: '應保全押金收據', fullAnalysis: '分析'
  };
  return state;
};

const renderComponent = () => render(
  <GlobalUIProvider><ToolProvider><UnifiedEntry /></ToolProvider></GlobalUIProvider>
);

describe('統一入口的引用檢索庫與驗證節點', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaseStore.getState().resetCase();
  });

  it('分析完成後必須渲染檢索庫節點並顯示法條與裁判筆數', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: completedState() })
    } as Response);

    renderComponent();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '房東拒不返還押金' } });
    fireEvent.click(screen.getByRole('button', { name: '開始分析' }));

    expect(await screen.findByText('法規與裁判要件庫檢索')).toBeInTheDocument();
    expect(screen.getByText('法規 2 筆 · 判例 1 筆')).toBeInTheDocument();
  });

  it('分析完成後必須渲染真確性檢核結果節點並顯示查核處數', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: completedState() })
    } as Response);

    renderComponent();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '房東拒不返還押金' } });
    fireEvent.click(screen.getByRole('button', { name: '開始分析' }));

    expect(await screen.findByText('真確性檢核結果')).toBeInTheDocument();
    expect(screen.getByText(/檢核 3 處 · 異常 0 處/)).toBeInTheDocument();
  });

  it('尚未分析時不得渲染這兩個節點', () => {
    renderComponent();
    expect(screen.queryByText('法規與裁判要件庫檢索')).not.toBeInTheDocument();
    expect(screen.queryByText('真確性檢核結果')).not.toBeInTheDocument();
  });
});
