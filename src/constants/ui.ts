/**
 * UIConstants - 專案極簡風格統一定義
 * 包含圓角 (rounded-xl)、標準間距 (p-6)、輸入框與按鈕樣式。
 * 全面移除硬編碼之 shadow 陰影與過度裝飾性邊框。
 */

export const UIConstants = {
  // 基礎圓角與間距
  rounded: 'rounded-xl',
  roundedFull: 'rounded-full',
  roundedSm: 'rounded-lg',
  padding: 'p-6',
  paddingCompact: 'p-4',
  paddingSmall: 'p-3',

  // 容器與卡片 (統一 rounded-xl 與 p-6，無任何 shadow)
  card: 'bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100',
  cardCompact: 'bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100',
  cardSubtle: 'bg-[#0e1424] border border-slate-800 rounded-xl p-6 text-slate-100',
  cardSubtleCompact: 'bg-[#0e1424] border border-slate-800 rounded-xl p-4 text-slate-100',
  paper: 'bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] rounded-xl p-6 text-[var(--color-text-primary)]',

  // 輸入框樣式 (統一 rounded-xl，無 shadow，聚焦邊框強化)
  input: 'w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-sky-500 focus:outline-none transition-colors',
  textarea: 'w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-sky-500 focus:outline-none leading-relaxed resize-y transition-colors',
  select: 'w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-sky-500 focus:outline-none transition-colors',

  // 按鈕樣式 (統一 rounded-xl，無 shadow，清晰點擊回饋)
  buttonPrimary: 'px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondary: 'px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSuccess: 'px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonDanger: 'px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonGhost: 'px-3 py-1.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5',

  // 標籤與徽章 (精簡無陰影)
  badge: 'text-xs font-semibold px-2.5 py-1 rounded-md border',
  badgePrimary: 'text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border-sky-500/20',
  badgeSuccess: 'text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  badgeWarning: 'text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border-amber-500/20',
  badgeDanger: 'text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border-rose-500/20',

  // 流程進程報告樣式
  progressBar: 'w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800',
  progressFill: 'h-full transition-all duration-300 ease-out rounded-full',
} as const;

export default UIConstants;
