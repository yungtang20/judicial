import { describe, it, expect, vi, afterEach } from 'vitest';
import { isTransientProviderError } from './legalGenerationPipeline';

afterEach(() => {
  vi.useRealTimers();
});

describe('isTransientProviderError', () => {
  it('連線層級的暫時性故障應重試', () => {
    for (const message of [
      'This operation was aborted',
      'Request timed out',
      'AGNES_HTTP_522',
      'AGNES_HTTP_503',
      'AGNES_HTTP_429',
      'fetch failed',
      'socket hang up',
      'ECONNRESET',
      'ETIMEDOUT'
    ]) {
      expect(isTransientProviderError(new Error(message))).toBe(true);
    }
  });

  it('確定性結果不得重試，避免放寬安全閘門或徒增額度', () => {
    for (const message of [
      '法律文件引用檢核未通過（GHOST_CITATION_BLOCKED）: 民法第9999條',
      '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
      'INVALID_LAW_CITATION_BLOCKED',
      'LEGAL_INPUT_REJECTED',
      'PERMISSION_DENIED',
      'unauthorized',
      'AI_PROVIDER_CONFIG_INVALID'
    ]) {
      expect(isTransientProviderError(new Error(message))).toBe(false);
    }
  });

  it('非 Error 輸入一律視為不可重試', () => {
    expect(isTransientProviderError('This operation was aborted')).toBe(false);
    expect(isTransientProviderError(null)).toBe(false);
    expect(isTransientProviderError(undefined)).toBe(false);
  });
});
