import type { AppealSection, AppRoute, LitigationSection } from './navigation';

/**
 * 使用者可見的頁面名稱，單一來源。
 *
 * 先前同一個名稱散在四個檔案：Sidebar 選單、頁面標題、最近使用、
 * 工作台頁首。任何一處漏改就會出現「從選單點進去卻換一套說法」。
 * 這不是假設風險——本專案已實際發生過兩次：
 *
 * 1. ToolboxHeader 寫成「我要做自己一份文件」，其他三處寫「我要自己做一份文件」。
 * 2. 最近使用把情境導診標成「不知道該做什麼」，與選單的「我遇到問題要處理」不同。
 *
 * 因此名稱一律由此模組提供；新增頁面時在此登記，避免再散落各處。
 */

/**
 * 民事工作區各段落的名稱。
 *
 * 注意：側邊欄子項用的 tab 名稱不是 AppRoute.section 的值，
 * 這裡只登記真正存在的路由段落。
 */
const LITIGATION_SECTION_LABELS: Record<LitigationSection, string> = {
  guide: '我遇到問題要處理',
  toolbox: '我要自己做一份文件',
  defense: '雙軌訴訟防禦',
  issues: '爭點與證據清單',
  evidence: '爭點與證據清單',
};

/** 上訴工作區各段落的名稱。 */
const APPEAL_SECTION_LABELS: Record<AppealSection, string> = {
  analysis: '我收到判決書了',
  deadline: '還有多少時間可以上訴',
  defense: '準備防守與答辯',
  issues: '整理爭點與證據',
  evidence: '整理爭點與證據',
};

const VIEW_LABELS: Record<Exclude<AppRoute['view'], 'litigation' | 'appeal'>, string> = {
  analysis: '我遇到問題要處理',
  'process-guide': '依案件類型看流程',
  sdlc: 'SDLC 交付工作台（開發用）',
  'agent-chat': '問一個法律問題',
  checker: '檢查文件有沒有問題',
};

/**
 * 頁面名稱。使用者是從側邊欄問句入口點進來的，
 * 這裡回傳的必須與側邊欄顯示的一致。
 */
export function routeDisplayName(route: AppRoute): string {
  if (route.view === 'litigation') return LITIGATION_SECTION_LABELS[route.section];
  if (route.view === 'appeal') return APPEAL_SECTION_LABELS[route.section];
  return VIEW_LABELS[route.view];
}

/**
 * 給定工作區根節點與目前段落，回傳該頁應顯示的名稱。
 *
 * `WorkspaceSection` 另有 legacy 的 'appeal'，等同上訴工作區的 'analysis'
 * （canonicalizeRoute 也是這樣映射的），這裡一併正規化。
 */
export function workspaceDisplayName(
  root: 'litigation' | 'appeal',
  section: LitigationSection | AppealSection | 'appeal',
): string {
  const 正規化 = section === 'appeal' ? 'analysis' : section;
  return root === 'appeal'
    ? APPEAL_SECTION_LABELS[正規化 as AppealSection]
    : LITIGATION_SECTION_LABELS[正規化 as LitigationSection];
}
