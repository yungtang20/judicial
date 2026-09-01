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
});
