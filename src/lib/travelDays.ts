/**
 * 在途期間天數（依司法院「法院訴訟當事人在途期間標準」）。
 *
 * 為何必須是單一來源：
 * 先前 SmartAppealAssistant 只有 0/2/4 天三個選項，且把 4 天標為「長途/離島」；
 * 而 AppealDeadlineTool 依司法院標準列出 0/2/3/4/5/8 天六級，離島是 8 天。
 * 同一個法律概念在兩個畫面給出不同天數——
 * 在金門、馬祖、澎湖的當事人若用了前者，期限會少算 4 天，
 * 在 20 日不變期間內可能因此喪失上訴權。
 *
 * 兩個畫面一律引用本表，避免日後再各自修改而漂移。
 */
export interface TravelDaysOption {
  label: string;
  days: number;
}

export const TRAVEL_DAYS_OPTIONS: readonly TravelDaysOption[] = [
  { label: '同一行政區 / 所在地法院 (0天)', days: 0 },
  { label: '同縣市不同區 / 鄰近縣市 (2天)', days: 2 },
  { label: '跨中長程縣市 (如基隆-台中) (3天)', days: 3 },
  { label: '跨長程縣市 (如台北-高雄) (4天)', days: 4 },
  { label: '花蓮、台東、澎湖等地區 (5天)', days: 5 },
  { label: '金門、馬祖等離島地區 (8天)', days: 8 },
] as const;

/** 供 <select> 直接使用。 */
export const TRAVEL_DAYS_SELECT_OPTIONS = TRAVEL_DAYS_OPTIONS;
