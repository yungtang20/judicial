import type { CaseArtifactStatus } from '../../domain/case/types';

/**
 * 由引用驗證結果決定文件狀態，唯一的 fail-closed 判定來源。
 *
 * 為什麼需要集中：產製文件的入口有三個（LegalToolbox、
 * DefenseWorkflowTool、SmartAppealAssistant），先前各自寫了一份判定，
 * 結果 DefenseWorkflowTool 那份是反的——
 *
 *   antiGhostVerification?.ghostCitationsFound ? '需人工審閱' : '已驗證'
 *
 * 當驗證未執行或未回傳（antiGhostVerification 為 undefined）時，
 * 條件為 falsy，未驗證的文件反而被標成「已驗證」。
 * 法律文件帶著「已驗證」的標記進到法院，是替使用者背書，
 * 專案治理規則明訂未驗證一律 Fail-Closed。
 *
 * 三個入口現在都呼叫這裡，規則只有一份。
 */

/** 引用驗證結果的最小結構；只讀取判定所需的欄位。 */
export interface CitationVerificationLike {
  verificationPassed?: boolean;
  ghostCitationsFound?: number;
}

/**
 * 只有在驗證明確通過、且沒有幽靈引用時才算「已驗證」。
 * 任何缺漏、不確定或失敗都落到 NEEDS_HUMAN_REVIEW。
 */
export function resolveDocumentStatus(
  verification: CitationVerificationLike | null | undefined
): CaseArtifactStatus {
  if (!verification) return 'NEEDS_HUMAN_REVIEW';
  if (verification.verificationPassed !== true) return 'NEEDS_HUMAN_REVIEW';
  if (verification.ghostCitationsFound) return 'NEEDS_HUMAN_REVIEW';
  return 'VERIFIED';
}