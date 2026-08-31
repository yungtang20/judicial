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
});
