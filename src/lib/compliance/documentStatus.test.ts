import { describe, it, expect } from 'vitest';
import { resolveDocumentStatus } from './documentStatus';

/**
 * 實測缺陷：DefenseWorkflowTool 原本寫成
 *
 *   antiGhostVerification?.ghostCitationsFound ? 'NEEDS_HUMAN_REVIEW' : 'VERIFIED'
 *
 * 當驗證未執行或未回傳（antiGhostVerification 為 undefined）時，
 * 條件為 falsy，未驗證的文件被標成「已驗證」。
 * 法律文件帶著「已驗證」標記進法院，等於替使用者背書。
 *
 * 這裡測的是判定結果本身，不是原始碼字串。
 */
describe('文件狀態的 fail-closed 判定', () => {
  it('驗證明確通過且無幽靈引用才算已驗證', () => {
    expect(resolveDocumentStatus({ verificationPassed: true, ghostCitationsFound: 0 })).toBe('VERIFIED');
  });

  it('驗證未執行或未回傳時不得標成已驗證', () => {
    expect(resolveDocumentStatus(undefined)).toBe('NEEDS_HUMAN_REVIEW');
    expect(resolveDocumentStatus(null)).toBe('NEEDS_HUMAN_REVIEW');
    expect(resolveDocumentStatus({})).toBe('NEEDS_HUMAN_REVIEW');
  });

  it('驗證未通過時落到人工審閱', () => {
    expect(resolveDocumentStatus({ verificationPassed: false, ghostCitationsFound: 0 })).toBe('NEEDS_HUMAN_REVIEW');
  });

  it('有幽靈引用時落到人工審閱，即使 verificationPassed 為 true', () => {
    expect(resolveDocumentStatus({ verificationPassed: true, ghostCitationsFound: 2 })).toBe('NEEDS_HUMAN_REVIEW');
  });

  it('verificationPassed 必須明確為 true，truthy 值不算數', () => {
    // 若實作誤用寬鬆判斷，這裡會被誤標為已驗證
    expect(resolveDocumentStatus({ verificationPassed: undefined, ghostCitationsFound: 0 })).toBe('NEEDS_HUMAN_REVIEW');
  });

  it('幽靈引用數為 0 時才視為沒有幽靈引用', () => {
    expect(resolveDocumentStatus({ verificationPassed: true, ghostCitationsFound: 0 })).toBe('VERIFIED');
    expect(resolveDocumentStatus({ verificationPassed: true, ghostCitationsFound: 1 })).toBe('NEEDS_HUMAN_REVIEW');
  });
});