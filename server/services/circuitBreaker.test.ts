// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, executeWithResilience } from './circuitBreaker.js';

/**
 * 熔斷器必須在接上正式路徑之前先被驗證。
 *
 * 實測：整個 `circuitBreaker.ts` 從未被任何程式碼引用——
 * 熔斷保護寫好了卻沒有啟用。外部 AI／司法院／RAG 失敗時沒有熔斷，
 * 只有重試。
 *
 * 這裡先建立它的行為契約，讓接上正式路徑時有安全網。
 */
describe('CircuitBreaker 狀態機', () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const 造 = (門檻 = 3, 冷卻 = 1000) =>
    new CircuitBreaker({ serviceName: '測試服務', failureThreshold: 門檻, resetTimeoutMs: 冷卻 });

  it('初始狀態為 CLOSED，允許執行', () => {
    const b = 造();
    expect(b.getState()).toBe('CLOSED');
    expect(b.isExecutionPermitted()).toBe(true);
  });

  it('未達門檻前維持 CLOSED', () => {
    const b = 造(3);
    b.recordFailure();
    b.recordFailure();
    expect(b.getState()).toBe('CLOSED');
    expect(b.isExecutionPermitted()).toBe(true);
  });

  it('連續失敗達門檻後轉為 OPEN 並拒絕執行', () => {
    const b = 造(3);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    expect(b.getState()).toBe('OPEN');
    expect(b.isExecutionPermitted(), 'OPEN 狀態必須拒絕新的執行').toBe(false);
  });

  it('冷卻期結束後轉為 HALF_OPEN 並允許試探', () => {
    vi.useFakeTimers();
    const b = 造(1, 1000);
    b.recordFailure();
    expect(b.getState()).toBe('OPEN');
    vi.advanceTimersByTime(1001);
    expect(b.getState()).toBe('HALF_OPEN');
    expect(b.isExecutionPermitted(), 'HALF_OPEN 應允許試探').toBe(true);
  });

  it('成功一次即回到 CLOSED 並歸零失敗計數', () => {
    vi.useFakeTimers();
    const b = 造(2, 1000);
    b.recordFailure();
    b.recordFailure();
    expect(b.getState()).toBe('OPEN');
    vi.advanceTimersByTime(1001);
    expect(b.getState()).toBe('HALF_OPEN');
    b.recordSuccess();
    expect(b.getState()).toBe('CLOSED');
    // 歸零後再失敗一次不應直接開啟
    b.recordFailure();
    expect(b.getState()).toBe('CLOSED');
  });
});

describe('executeWithResilience', () => {
  it('成功時直接回傳結果，不重試', async () => {
    const 動作 = vi.fn().mockResolvedValue('ok');
    const r = await executeWithResilience(動作, { timeoutMs: 100, maxRetries: 2, backoffFactorMs: 1 });
    expect(r).toBe('ok');
    expect(動作).toHaveBeenCalledTimes(1);
  });

  it('失敗時依設定次數重試後擲出', async () => {
    const 動作 = vi.fn().mockRejectedValue(new Error('連線失敗'));
    await expect(
      executeWithResilience(動作, { timeoutMs: 100, maxRetries: 2, backoffFactorMs: 1 })
    ).rejects.toThrow();
    // 初始嘗試一次，加上 2 次重試
    expect(動作).toHaveBeenCalledTimes(3);
  });

  it('逾時時以 AbortSignal 中止動作', async () => {
    const 動作 = vi.fn((signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    await expect(
      executeWithResilience(動作, { timeoutMs: 20, maxRetries: 0, backoffFactorMs: 1 })
    ).rejects.toThrow();
    expect(動作).toHaveBeenCalledTimes(1);
  });

  it('成功時重置熔斷器的失敗計數', async () => {
    const b = new CircuitBreaker({ serviceName: 'T', failureThreshold: 2, resetTimeoutMs: 1000 });
    b.recordFailure();
    expect(b.getState()).toBe('CLOSED');
    await executeWithResilience(async () => 'ok', { timeoutMs: 100, maxRetries: 0, breaker: b });
    // recordSuccess 已被呼叫，失敗計數歸零
    b.recordFailure();
    expect(b.getState(), '成功後失敗計數應歸零').toBe('CLOSED');
  });

  it('重試全數失敗後才計入熔斷器', async () => {
    const b = new CircuitBreaker({ serviceName: 'T', failureThreshold: 1, resetTimeoutMs: 1000 });
    const 動作 = vi.fn().mockRejectedValue(new Error('失敗'));
    await expect(
      executeWithResilience(動作, { timeoutMs: 100, maxRetries: 2, backoffFactorMs: 1, breaker: b })
    ).rejects.toThrow();
    expect(b.getState()).toBe('OPEN');
  });

  it('熔斷開啟時不得執行，直接擲出可理解的訊息', async () => {
    const b = new CircuitBreaker({ serviceName: '外部AI', failureThreshold: 1, resetTimeoutMs: 60000 });
    b.recordFailure();
    const 動作 = vi.fn();
    await expect(
      executeWithResilience(動作, {
        timeoutMs: 100, maxRetries: 2, backoffFactorMs: 1, breaker: b,
        fallbackMessage: '外部服務暫時無法連線，請稍後再試'
      })
    ).rejects.toThrow('外部服務暫時無法連線，請稍後再試');
    expect(動作, '熔斷開啟時不得呼叫外部服務').not.toHaveBeenCalled();
  });

  it('未提供熔斷器時也能正常運作', async () => {
    const 動作 = vi.fn().mockResolvedValue('ok');
    const r = await executeWithResilience(動作, { timeoutMs: 100, maxRetries: 0 });
    expect(r).toBe('ok');
  });

  it('不得把外部錯誤的原始訊息暴露給終端', async () => {
    const 動作 = vi.fn().mockRejectedValue(new Error('內部路徑 D:\\secret\\key123 洩漏'));
    await expect(
      executeWithResilience(動作, {
        timeoutMs: 100, maxRetries: 0, backoffFactorMs: 1,
        fallbackMessage: '外部服務暫時忙碌或未回應，請稍後重試'
      })
    ).rejects.toThrow('外部服務暫時忙碌或未回應，請稍後重試');
  });
});
