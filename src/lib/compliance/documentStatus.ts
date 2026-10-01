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
  /** 本次實際核對了幾處引用。 */
  totalCitationsChecked?: number;
}

/**
 * 只有在驗證明確通過、沒有幽靈引用、而且確實核對過引用時才算「已驗證」。
 * 任何缺漏、不確定或失敗都落到 NEEDS_HUMAN_REVIEW。
 *
 * 零引用不能算已驗證。
 *
 * 實測：對完全沒有引用任何法條的文件，驗證器回
 * { totalCitationsChecked: 0, ghostCitationsFound: 0, status: 'VERIFIED' }，
 * 套用本函式會得到 'VERIFIED'。但「沒有任何法律依據」不等於
 * 「法律依據已查核無誤」——前者是根本沒東西可以查。
 * 專案在 IssueTableGenerator 已明確處理這情況並提示
 * 「這份文件尚未引用任何法條或裁判」，文件狀態不該與之相反。
 *
 * 匯出與列印另有 passGate 把關（要求 totalChecked > 0），
 * 但案件卷宗與核准紀錄會顯示這個狀態，綠色的「已驗證」會誤導人工審閱。
 */
export function resolveDocumentStatus(
  verification: CitationVerificationLike | null | undefined
): CaseArtifactStatus {
  if (!verification) return 'NEEDS_HUMAN_REVIEW';
  if (verification.verificationPassed !== true) return 'NEEDS_HUMAN_REVIEW';
  if (verification.ghostCitationsFound) return 'NEEDS_HUMAN_REVIEW';
  if (!(verification.totalCitationsChecked > 0)) return 'NEEDS_HUMAN_REVIEW';
  return 'VERIFIED';
}