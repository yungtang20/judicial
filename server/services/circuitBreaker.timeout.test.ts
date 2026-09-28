import { afterEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, executeWithResilience } from './circuitBreaker';

/**
 * 熔斷器在真實逾時下的行為。
 *
 * 正式站實測：上游約 30 秒就回錯誤，會讓熔斷器累積失敗。
 * 熔斷器若誤判，上游恢復後仍會持續拒絕服務；
 * 若不熔斷，則每個請求都會等滿逾時，使用者全部看到錯誤。
 *
 * 逾時在真實執行的結果就是 action 拋出中止類錯誤
 * （AbortController 觸發後 fetch 拒絕），因此以該錯誤模擬。
 *
 * 時間控制：冷卻時間以 fake timers 推進，不使用真實等待。
 */

const 選項 = { maxRetries: 0, timeoutMs: 30_000 };
const 中止錯誤 = () => new Error('The operation was aborted');
const 上游錯誤 = () => new Error('AGNES_HTTP_503');

describe('熔斷器在真實逾時下的行為', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('連續失敗達門檻後應短路，不再呼叫上游', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 3, resetTimeoutMs: 30_000 });
    const 上游 = vi.fn().mockRejectedValue(上游錯誤());

    for (let i = 0; i < 3; i++) {
      await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    }
    expect(上游).toHaveBeenCalledTimes(3);

    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    expect(上游, '熔斷後不應再呼叫上游').toHaveBeenCalledTimes(3);
  });

  it('逾時（中止）應計為失敗並觸發熔斷', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 2, resetTimeoutMs: 30_000 });
    const 上游 = vi.fn().mockRejectedValue(中止錯誤());

    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    expect(上游, '逾時應計為失敗並觸發熔斷').toHaveBeenCalledTimes(2);
  });

  it('冷卻時間到後應自動恢復', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 2, resetTimeoutMs: 1_000 });
    const 上游 = vi.fn()
      .mockRejectedValueOnce(上游錯誤())
      .mockRejectedValueOnce(上游錯誤())
      .mockResolvedValueOnce('恢復後的回覆');

    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();
    expect(上游).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_500);
    const 結果 = await executeWithResilience(() => 上游(), { ...選項, breaker });
    expect(結果).toBe('恢復後的回覆');
    expect(上游).toHaveBeenCalledTimes(3);
  });

  it('成功呼叫不得累積失敗次數', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 3, resetTimeoutMs: 30_000 });
    const 上游 = vi.fn().mockResolvedValue('ok');

    for (let i = 0; i < 10; i++) {
      await executeWithResilience(() => 上游(), { ...選項, breaker });
    }
    expect(上游).toHaveBeenCalledTimes(10);
  });

  it('失敗與成功交錯時不得誤觸熔斷', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 3, resetTimeoutMs: 30_000 });
    let 呼叫 = 0;
    const 上游 = vi.fn(async () => {
      呼叫++;
      if (呼叫 % 2 === 0) throw 上游錯誤();
      return 'ok';
    });

    for (let i = 0; i < 6; i++) {
      await executeWithResilience(() => 上游(), { ...選項, breaker }).catch(() => undefined);
    }
    expect(呼叫, '交錯成功與失敗不應觸發熔斷').toBe(6);
  });

  it('短路時的訊息不得洩漏內部細節', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 1, resetTimeoutMs: 30_000 });
    const 上游 = vi.fn().mockRejectedValue(new Error('內部路徑 /var/secrets/token 失效'));

    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();

    let 第二次訊息 = '';
    try {
      await executeWithResilience(() => 上游(), { ...選項, breaker, fallbackMessage: undefined });
    } catch (e) {
      第二次訊息 = e instanceof Error ? e.message : String(e);
    }
    expect(第二次訊息).not.toContain('/var/secrets');
  });

  it('短路訊息應說明是保護機制，而非洩漏細節', async () => {
    const breaker = new CircuitBreaker({ serviceName: '測試', failureThreshold: 1, resetTimeoutMs: 30_000 });
    const 上游 = vi.fn().mockRejectedValue(上游錯誤());

    await expect(executeWithResilience(() => 上游(), { ...選項, breaker })).rejects.toThrow();

    let 第二次訊息 = '';
    try {
      await executeWithResilience(() => 上游(), { ...選項, breaker });
    } catch (e) {
      第二次訊息 = e instanceof Error ? e.message : String(e);
    }
    expect(第二次訊息).toContain('安全保護機制');
    expect(第二次訊息).not.toContain('AGNES_HTTP_503');
  });
});
