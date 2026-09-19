import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveJdgToken,
  getValidJdgToken,
  clearJdgToken,
  saveMemberToken,
  getValidMemberToken,
  clearMemberToken
} from './judicialTokenStore';

describe('JudicialTokenStore (司法院 Token 持久化與時效管理)', () => {
  beforeEach(() => {
    clearJdgToken();
    clearMemberToken();
  });

  it('應能正確儲存與讀取未過期的 JDG Token', () => {
    saveJdgToken('test-jdg-token-12345', 6);
    const token = getValidJdgToken();
    expect(token).toBe('test-jdg-token-12345');
  });

  it('過期的 JDG Token 應自動失效並清除', () => {
    // 傳入 0 小時使之過期
    saveJdgToken('expired-token', -1);
    const token = getValidJdgToken();
    expect(token).toBeNull();
  });

  it('手動清除 JDG Token 後讀取應為 null', () => {
    saveJdgToken('token-to-delete', 2);
    clearJdgToken();
    expect(getValidJdgToken()).toBeNull();
  });

  it('應能正確儲存與讀取會員 Token', () => {
    saveMemberToken('member-jwt-token-xyz');
    expect(getValidMemberToken()).toBe('member-jwt-token-xyz');
  });

  it('手動清除會員 Token 後讀取應為 null', () => {
    saveMemberToken('member-token-2');
    clearMemberToken();
    expect(getValidMemberToken()).toBeNull();
  });
});
