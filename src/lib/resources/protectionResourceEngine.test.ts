import { describe, expect, it } from 'vitest';
import { buildAntiFraudWarning, detectHighRiskCase, redactPII } from './protectionResourceEngine';

describe('protectionResourceEngine', () => {
  it('detects safety and fraud signals without sending data externally', () => {
    expect(detectHighRiskCase('我遭遇家暴')).toBe(true);
    expect(buildAntiFraudWarning('對方要求我加LINE後匯款')).toBeTruthy();
    expect(redactPII('身分 A123456789')).not.toContain('A123456789');
  });
});
