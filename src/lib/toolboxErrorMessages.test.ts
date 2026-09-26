import { describe, it, expect } from 'vitest';
import { presentToolboxError } from './toolboxErrorMessages';

describe('presentToolboxError', () => {
  it('暫時性服務故障標示為可重試並給出中文說明', () => {
    const result = presentToolboxError(
      'PRODUCTION_TOOLBOX_FALLBACK_BLOCKED',
      'Production toolbox fallback is disabled for DEMAND_LETTER_GENERAL; no unverified substitute document may be returned.'
    );
    expect(result.retryable).toBe(true);
    expect(result.message).not.toMatch(/Production toolbox|DEMAND_LETTER_GENERAL/);
    expect(result.guidance).toContain('產製');
  });

  it('引用驗證失敗不得暗示可以直接重試就會成功', () => {
    const result = presentToolboxError('DOCUMENT_VERIFICATION_FAILED', '法律文件引用檢核未通過，拒絕回傳未確認引用文件');
    expect(result.message).toContain('引用');
    expect(result.retryable).toBe(true);
  });

  it('輸入缺漏標示為不可重試，需補正資料', () => {
    const result = presentToolboxError('CANONICAL_PLEADING_INPUT_REQUIRED', '書狀輸入不足');
    expect(result.retryable).toBe(false);
    expect(result.guidance).toContain('補齊');
  });

  it('尚未開放的書狀類別不得讓使用者反覆重試', () => {
    const result = presentToolboxError('P9_FINAL_GATE_FAILED', '此類別尚未支援 P4-P9 確定性管線');
    expect(result.retryable).toBe(false);
    expect(result.guidance).toContain('尚未');
  });

  it('未知代碼但為英文內部訊息時不得直接顯示原文', () => {
    const result = presentToolboxError(undefined, 'internal stack trace leaked from upstream service');
    expect(result.message).not.toContain('internal stack trace');
    expect(result.retryable).toBe(true);
  });

  it('已知代碼但無原始訊息時仍能給出說明', () => {
    const result = presentToolboxError('RATE_LIMITED');
    expect(result.message).toContain('頻繁');
    expect(result.retryable).toBe(true);
  });

  it('中文原始訊息可直接沿用', () => {
    const result = presentToolboxError(undefined, '請提供案情描述');
    expect(result.message).toBe('請提供案情描述');
  });

  it('完全無資訊時回傳通用訊息', () => {
    const result = presentToolboxError(undefined, undefined);
    expect(result.message).toBeTruthy();
    expect(result.guidance).toBeTruthy();
  });
});
