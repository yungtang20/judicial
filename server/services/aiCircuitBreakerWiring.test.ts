// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * AI 生成路徑的熔斷保護必須真的生效。
 *
 * 熔斷器本身已由 `circuitBreaker.test.ts` 驗證；
 * 這裡驗證的是**接線點**：外部 AI 服務持續失敗時，
 * 請求應在有限次嘗試後以可理解的訊息失敗，
 * 而不是無限重試並耗盡額度。
 */
describe('AI 生成路徑的熔斷接線', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('外部 AI 持續失敗時不得無限重試', async () => {
    // 以一個必然失敗的假 provider 觀察呼叫次數
    const { withTransientRetry } = await import('./legalGenerationPipeline.js');
    const provider = {
      generate: vi.fn().mockRejectedValue(new Error('AI 服務不可用'))
    };

    let 呼叫次數 = 0;
    await expect(
      withTransientRetry(() => {
        呼叫次數++;
        return provider.generate('測試') as Promise<string>;
      })
    ).rejects.toThrow();

    // withTransientRetry 固定嘗試 3 次（初始 + 2 次重試），不得更多
    expect(呼叫次數).toBeLessThanOrEqual(3);
    expect(呼叫次數).toBeGreaterThan(0);
  });

  it('暫時性錯誤會重試，確定性錯誤不會', async () => {
    const { withTransientRetry } = await import('./legalGenerationPipeline.js');

    const 暫時性 = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('成功');
    const 結果 = await withTransientRetry(暫時性 as never);
    expect(結果).toBe('成功');
    expect(暫時性).toHaveBeenCalledTimes(2);

    const 確定性 = vi.fn().mockRejectedValue(new Error('AI_GATE_APPROVAL_FORBIDDEN'));
    await expect(withTransientRetry(確定性 as never)).rejects.toThrow('AI_GATE_APPROVAL_FORBIDDEN');
    expect(確定性, '確定性錯誤不得重試').toHaveBeenCalledTimes(1);
  });

  it('熔斷開啟後，AI 呼叫會立即以可理解訊息失敗', async () => {
    const { aiBreaker, executeWithResilience } = await import('./circuitBreaker.js');
    // 強制開啟
    for (let i = 0; i < 5; i++) aiBreaker.recordFailure();
    expect(aiBreaker.getState()).toBe('OPEN');

    const provider = { generate: vi.fn() };
    await expect(
      executeWithResilience(() => provider.generate('x') as Promise<string>, {
        timeoutMs: 1000,
        maxRetries: 0,
        breaker: aiBreaker,
        fallbackMessage: 'AI 服務暫時無法連線，已啟動安全保護機制，請稍後再試'
      })
    ).rejects.toThrow('AI 服務暫時無法連線，已啟動安全保護機制，請稍後再試');
    expect(provider.generate, '熔斷開啟時不得呼叫外部服務').not.toHaveBeenCalled();

    // 復原，避免影響其他案例
    aiBreaker.recordSuccess();
  });
});
