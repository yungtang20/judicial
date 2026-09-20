import { describe, it, expect } from 'vitest';
import { scrubPersonalInfo } from './deidentifier';

describe('deidentifier', () => {
  it('should scrub ID numbers', () => {
    expect(scrubPersonalInfo('我的身分證是 A123456789。')).toBe('我的身分證是 A1********。');
  });
  it('should scrub mobile numbers', () => {
    expect(scrubPersonalInfo('電話 0912345678 聯絡')).toBe('電話 09******** 聯絡');
  });
  it('should scrub addresses', () => {
    expect(scrubPersonalInfo('住在 台北市大安區新生南路三段。')).toBe('住在 台北市大安區***。');
  });
});
