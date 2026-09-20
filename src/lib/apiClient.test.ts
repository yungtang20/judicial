import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';

// Mock global fetch
global.fetch = vi.fn();

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw ApiError when response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request', code: 'ERR_400' })
    });

    await expect(apiClient.analyzeJudgment('test')).rejects.toThrow('Bad Request');
  });

  it('should return json data when response is ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const result = await apiClient.analyzeJudgment('test');
    expect(result).toEqual({ success: true });
  });

  it('should handle non-JSON error responses gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Not JSON'); }
    });

    await expect(apiClient.analyzeJudgment('test')).rejects.toThrow('HTTP Error 500');
  });

  it('should call SDLC endpoints correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, project: { projectId: 'test_p' } })
    });

    const p1 = await apiClient.sdlcGetProject('test_p');
    expect(p1.success).toBe(true);

    const p2 = await apiClient.sdlcExecuteStage({ projectId: 'test_p', stageId: '01_plan', humanInput: 'test' });
    expect(p2.success).toBe(true);

    const p3 = await apiClient.sdlcAdvanceGate({ projectId: 'test_p', stageId: '01_plan' });
    expect(p3.success).toBe(true);

    const p4 = await apiClient.sdlcFeedbackLoop({
      projectId: 'test_p',
      fromStage: '04_test',
      targetStage: '03_build',
      reason: '發現時效漏洞',
      suggestedAdjustments: '重新校驗請求權時效'
    });
    expect(p4.success).toBe(true);
  });

  it('should send the remaining API requests to their documented endpoints', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await apiClient.fetchUrl('https://example.com');
    await apiClient.generatePetition({
      caseType: 'civil', courtName: '法院', caseNo: '案號', appellantName: '甲', appelleeName: '乙',
      issues: [], evidences: [], selectedPrecedents: []
    });
    await apiClient.searchTlr('關鍵字', 'statutes');
    await apiClient.fetchTlrFulltext('doc-1', 'judgment');
    await apiClient.ocr(['data:image/png;base64,test']);
    await apiClient.searchPrecedents('關鍵字', '民事', '地方法院', '理由');
    await apiClient.judicialAuth('account', 'password');
    await apiClient.judicialFetchDoc('token', 'jid');
    await apiClient.judicialFetchList('token', '2026-01-01', '2026-01-31', '法院', '系統');
    await apiClient.defenseTriage({ clientInput: '案件事實' });
    await apiClient.defenseScanMines({ clientInput: '案件事實' });
    await apiClient.defenseGeneratePleading({ pleadingType: 'LAWYER_PLEADING', clientInput: '案件事實' });
    await apiClient.toolboxGenerate({ toolCategory: 'CIVIL_TORT_GENERAL', params: {} });
    await apiClient.toolboxVerifyCitations({ documentText: '民法第184條' });

    const calls = (global.fetch as any).mock.calls;
    expect(calls.map(([url]: [string]) => url)).toEqual([
      '/api/fetch-url',
      '/api/generate-appeal-petition',
      '/api/tlr/search',
      '/api/tlr/fulltext',
      '/api/ocr',
      '/api/search-precedents',
      '/api/judicial/jdg/auth',
      '/api/judicial/jdg/jdoc',
      '/api/judicial/jdg/jlist',
      '/api/defense/triage',
      '/api/defense/scan-mines',
      '/api/defense/generate-pleading',
      '/api/toolbox/generate',
      '/api/toolbox/verify-citations'
    ]);
    expect(calls.every(([, options]: [string, RequestInit]) => options.method === 'POST')).toBe(true);
  });
});
