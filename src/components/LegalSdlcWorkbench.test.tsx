import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/apiClient';
import { SdlcProjectState } from '../domain/sdlc/types';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';
import { LegalSdlcWorkbench, PROJECT_ID_STORAGE_KEY } from './LegalSdlcWorkbench';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    sdlcGetProject: vi.fn(),
    sdlcExecuteStage: vi.fn(),
    sdlcAdvanceGate: vi.fn(),
    sdlcFeedbackLoop: vi.fn()
  }
}));

const sdlcGetProject = vi.mocked(apiClient.sdlcGetProject);

const makeProject = (projectId: string): SdlcProjectState => ({
  projectId,
  title: '民事損害賠償與不當得利 AI 原生交付專案',
  legalDomain: 'CIVIL',
  currentStageId: '02_design',
  stageStatuses: {
    '01_plan': 'completed',
    '02_design': 'in_progress',
    '03_build': 'pending',
    '04_test': 'pending',
    '05_deploy': 'pending',
    '06_maintain': 'pending'
  },
  artifacts: { '01_plan': [], '02_design': [], '03_build': [], '04_test': [], '05_deploy': [], '06_maintain': [] },
  gates: {
    '01_plan': {
      stageId: '01_plan',
      gateName: '需求範圍確認',
      riskDescription: '請求權基礎是否正確界定',
      requiredCheckpoints: ['事實要件對應'],
      passed: true
    }
  } as SdlcProjectState['gates'],
  iterationsCount: 0,
  feedbackHistory: [],
  updatedAt: '2026-09-26T00:00:00.000Z'
});

const renderWorkbench = () => render(
  <GlobalUIProvider>
    <LegalSdlcWorkbench />
  </GlobalUIProvider>
);

const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

const useThrowingLocalStorage = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError: localStorage is disabled');
    }
  });
};

const restoreLocalStorage = () => {
  if (localStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', localStorageDescriptor);
  }
};

describe('LegalSdlcWorkbench 專案識別持久化', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sdlcGetProject.mockImplementation(async (projectId: string) => ({ project: makeProject(projectId) }));
  });

  afterEach(() => {
    restoreLocalStorage();
    vi.restoreAllMocks();
  });

  it('重新掛載兩次會沿用同一個專案 id，不會另建空白專案', async () => {
    const { unmount } = renderWorkbench();
    await waitFor(() => expect(sdlcGetProject).toHaveBeenCalledTimes(1));
    const firstId = sdlcGetProject.mock.calls[0][0];
    expect(firstId).toMatch(/^sdlc_ui_[0-9a-f-]{36}$/);
    expect(localStorage.getItem(PROJECT_ID_STORAGE_KEY)).toBe(firstId);

    unmount();
    renderWorkbench();
    await waitFor(() => expect(sdlcGetProject).toHaveBeenCalledTimes(2));

    expect(sdlcGetProject.mock.calls[1][0]).toBe(firstId);
  });

  it('持久化值損毀時重新產生合法 id 並覆寫', async () => {
    localStorage.setItem(PROJECT_ID_STORAGE_KEY, 'not-a-valid-project-id');

    renderWorkbench();
    await waitFor(() => expect(sdlcGetProject).toHaveBeenCalledTimes(1));

    const recovered = sdlcGetProject.mock.calls[0][0];
    expect(recovered).toMatch(/^sdlc_ui_[0-9a-f-]{36}$/);
    expect(localStorage.getItem(PROJECT_ID_STORAGE_KEY)).toBe(recovered);
  });

  it('localStorage 拋錯時仍能掛載並送出請求', async () => {
    useThrowingLocalStorage();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWorkbench();
    await waitFor(() => expect(sdlcGetProject).toHaveBeenCalledTimes(1));

    expect(sdlcGetProject.mock.calls[0][0]).toMatch(/^sdlc_ui_[0-9a-f-]{36}$/);
    await screen.findByRole('button', { name: /立即生成工件/ });
    warn.mockRestore();
  });

  it('getOrCreateProject 失敗時顯示錯誤訊息，不會永久載入', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sdlcGetProject.mockRejectedValue(new Error('專案識別不存在'));

    renderWorkbench();

    const alert = await screen.findByTestId('sdlc-load-error');
    expect(alert).toHaveTextContent('載入 SDLC 專案失敗：專案識別不存在');
    expect(screen.getByRole('button', { name: /重新載入專案/ })).toBeInTheDocument();
  });

  it('伺服器回傳空專案時同樣顯示錯誤訊息', async () => {
    sdlcGetProject.mockResolvedValue({ project: null });

    renderWorkbench();

    const alert = await screen.findByTestId('sdlc-load-error');
    expect(alert).toHaveTextContent('伺服器未回傳專案');
  });
});

describe('訪客身分更新後的專案復原', () => {
  it('無法存取原工作階段時必須改以新識別重建，且不得顯示內部租戶錯誤', async () => {
    const projectId = 'sdlc_ui_11111111-2222-3333-4444-555555555555';
    localStorage.setItem('judicial.sdlc.projectId', projectId);
    const calls: string[] = [];
    let attempt = 0;

    sdlcGetProject.mockImplementation(async (id: string) => {
      calls.push(id);
      attempt += 1;
      if (attempt === 1) {
        throw new Error('禁止跨租戶存取案件或文件資源');
      }
      return { project: makeProject(id) };
    });

    render(<GlobalUIProvider><LegalSdlcWorkbench /></GlobalUIProvider>);

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2), { timeout: 5000 });

    // 第二次必須使用不同的識別
    expect(calls[0]).toBe(projectId);
    expect(calls[1]).not.toBe(projectId);
    // 新的識別必須已寫入 localStorage
    expect(localStorage.getItem('judicial.sdlc.projectId')).not.toBe(projectId);
    // 不得顯示內部的租戶／權限術語
    expect(screen.queryByText(/無權存取|租戶|跨租戶/)).not.toBeInTheDocument();
  });
});
