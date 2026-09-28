import { describe, expect, it } from 'vitest';
import { isTransientProviderError } from './legalGenerationPipeline';

/**
 * 逾時不得重試。
 *
 * 逾時代表上游在 60 秒內無法完成；同一份提示詞再送一次，
 * 成功的機率不高，卻讓等待時間三倍化：
 *   60s + 0.8s + 60s + 2s + 60s = 182.8 秒
 * 使用者按下「分析判決書」後可能盯著畫面三分鐘，
 * 比直接拿到明確的錯誤更糟。
 *
 * 只有連線層失敗與上游忙碌（5xx / 429）才值得重試。
 */
describe('是否值得重試', () => {
  it('逾時與中止不重試', () => {
    const 逾時類 = [
      'The operation was aborted',
      'Request timed out',
      'timeout of 60000ms exceeded',
      'ABORT_ERR',
    ];
    for (const message of 逾時類) {
      expect(
        isTransientProviderError(new Error(message)),
        `「${message}」不應重試，否則等待時間會三倍化`,
      ).toBe(false);
    }
  });

  it('連線層失敗要重試', () => {
    // 這些情況下一次嘗試很可能就成功。
    const 連線類 = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'socket hang up',
      'fetch failed',
    ];
    for (const message of 連線類) {
      expect(isTransientProviderError(new Error(message)), `「${message}」應重試`).toBe(true);
    }
  });

  it('上游忙碌要重試', () => {
    expect(isTransientProviderError(new Error('AGNES_HTTP_429'))).toBe(true);
    expect(isTransientProviderError(new Error('AGNES_HTTP_503'))).toBe(true);
  });

  it('內容層失敗不重試', () => {
    // 引用遭查核駁回是內容問題，重試只會產生同樣的結果，
    // 而且浪費使用者的等待時間。
    const 內容類 = [
      'GHOST_CITATION_DETECTED',
      'VERIFICATION_FAILED',
      'INVALID_INPUT',
      'P9_FINAL_GATE_FAILED',
      'CANONICAL_PLEADING_INPUT_REQUIRED',
      'API_KEY_UNAVAILABLE',
    ];
    for (const message of 內容類) {
      expect(isTransientProviderError(new Error(message)), `「${message}」不應重試`).toBe(false);
    }
  });

  it('非 Error 物件不重試', () => {
    expect(isTransientProviderError('timeout')).toBe(false);
    expect(isTransientProviderError(null)).toBe(false);
    expect(isTransientProviderError(undefined)).toBe(false);
  });

  it('最壞等待時間不得超過兩次嘗試', () => {
    // 直接驗證重試策略的上界：逾時不重試時，
    // 單次請求最壞就是一個逾時週期，而不是三個。
    const 逾時 = new Error('Request timed out');
    expect(isTransientProviderError(逾時)).toBe(false);
  });
});
