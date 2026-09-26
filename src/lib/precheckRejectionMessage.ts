import type { LegalInputPrecheckResult } from './legalInputPrecheck';

/**
 * 把輸入預檢的拒絕理由轉成使用者看得懂的訊息。
 *
 * 背景：各路由原本一律回報「輸入內容包含顯著異常或虛構之法律條號」，
 * 但預檢本身對空白輸入給的是 INVALID_REQUEST「法律輸入內容不得為空」。
 * 路由丟掉了預檢的真實理由，導致空白輸入也被說成含有幽靈法條，
 * 使用者會去查一個不存在的問題。
 */
const REASON_BY_CODE: Record<string, string> = {
  INVALID_REQUEST: '請提供判決書或案件內容後再行分析。',
  MALFORMED_CITATION: '輸入內容中的引用格式或案號被判定為高度可疑，請確認後再行分析。',
  UNVERIFIED_CITATION: '輸入內容包含無法確認的法律引用，已被安全機制攋截。'
};

export function describePrecheckRejection(precheck: LegalInputPrecheckResult): string {
  return (
    precheck.issues
      .map(issue => REASON_BY_CODE[issue.code])
      .find((text): text is string => Boolean(text)) ??
    '輸入內容未通過安全檢查，請確認後再行分析。'
  );
}
