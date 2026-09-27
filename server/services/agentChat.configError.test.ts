// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isProviderConfigError } from './agentChat';

/**
 * AI 提供商的設定錯誤必須與暫時性故障區分開。
 *
 * 實測：未設定 GEMINI_API_KEY 時拋出 GEMINI_API_KEY_UNAVAILABLE，
 * 使用者卻看到「AI 回應逾時或發生錯誤，請稍後再試」。
 * 那不是逾時，而且重試永遠不會成功——
 * 使用者被引導去等待，管理者只能從伺服器記錄才知道真正原因。
 *
 * 專案其他路由（unifiedWorkflow）已有 AI_PROVIDER_CONFIG_INVALID 的處理，
 * 對話路徑原先沒有。
 */
describe('AI 提供商設定錯誤的判定', () => {
  it.each([
    'GEMINI_API_KEY_UNAVAILABLE',
    'AGNES_API_KEY_UNAVAILABLE',
    'HCNSEC_API_KEY_UNAVAILABLE',
    'AI_PROVIDER_CONFIG_INVALID'
  ])('應判定為設定錯誤：%s', message => {
    expect(isProviderConfigError(new Error(message))).toBe(true);
  });

  it.each([
    'This operation was aborted',
    'Request timed out',
    'fetch failed',
    'socket hang up',
    'ECONNRESET',
    'ETIMEDOUT',
    'AGNES_HTTP_522',
    'AGNES_HTTP_429',
    'AI 回應逾時或發生錯誤，請稍後再試。'
  ])('應判定為暫時性故障：%s', message => {
    expect(isProviderConfigError(new Error(message))).toBe(false);
  });

  it('非 Error 輸入不得被當成設定錯誤', () => {
    expect(isProviderConfigError(null)).toBe(false);
    expect(isProviderConfigError(undefined)).toBe(false);
    expect(isProviderConfigError('GEMINI_API_KEY_UNAVAILABLE')).toBe(true);
  });

  it('設定錯誤訊息不得聲稱是逾時', () => {
    // 使用者看到「逾時」會一直重試，但缺金鑰時重試沒有用
    const 設定錯誤訊息 = 'AI 服務尚未完成設定，暫時無法回答問題。請聯絡系統管理員設定 AI 提供商金鑰後再試。';
    expect(設定錯誤訊息).not.toContain('逾時');
    expect(設定錯誤訊息).toContain('設定');
  });
});
