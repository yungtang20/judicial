import { describe, it, expect, vi, afterEach } from 'vitest';
import { isTransientProviderError, withTransientRetry } from './legalGenerationPipeline';

afterEach(() => {
  vi.useRealTimers();
});

/**
 * 分類函式測得再準，也不能證明呼叫端真的照分類行動。
 * 這裡直接驗證重試行為：暫時性錯誤要重試，確定性錯誤一次都不能多試。
 */
describe('withTransientRetry 的實際重試行為', () => {
  it('暫時性錯誤會重試，並在最後一次嘗試後拋出', async () => {
    vi.useFakeTimers();
    let 次數 = 0;
    const 執行 = withTransientRetry(async () => {
      次數++;
      throw new Error('fetch failed');
    });
    const 斷言 = expect(執行).rejects.toThrow('fetch failed');
    await vi.advanceTimersByTimeAsync(10_000);
    await 斷言;
    // 初始嘗試一次，加上 2 次重試
    expect(次數).toBe(3);
  });

  it('確定性錯誤一次都不重試', async () => {
    vi.useFakeTimers();
    let 次數 = 0;
    const 執行 = withTransientRetry(async () => {
      次數++;
      throw new Error('AI_GATE_APPROVAL_FORBIDDEN');
    });
    const 斷言 = expect(執行).rejects.toThrow('AI_GATE_APPROVAL_FORBIDDEN');
    await vi.advanceTimersByTimeAsync(10_000);
    await 斷言;
    expect(次數).toBe(1);
  });

  it('暫時性錯誤後重試成功，直接回傳結果', async () => {
    vi.useFakeTimers();
    let 次數 = 0;
    const 執行 = withTransientRetry(async () => {
      次數++;
      if (次數 < 2) throw new Error('socket hang up');
      return 'ok';
    });
    const 斷言 = 執行.then(v => v);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(斷言).resolves.toBe('ok');
    expect(次數).toBe(2);
  });
});

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
