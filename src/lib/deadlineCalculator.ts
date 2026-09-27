const TW_HOLIDAYS = new Set([
  '2023-01-01', '2023-01-02', '2023-01-20', '2023-01-23', '2023-01-24', '2023-01-25', '2023-01-26', '2023-01-27',
  '2023-02-27', '2023-02-28', '2023-04-03', '2023-04-04', '2023-04-05', '2023-05-01', '2023-06-22', '2023-06-23',
  '2023-09-29', '2023-10-09', '2023-10-10', '2024-01-01', '2024-02-08', '2024-02-09', '2024-02-12', '2024-02-13',
  '2024-02-14', '2024-02-28', '2024-04-04', '2024-04-05', '2024-05-01', '2024-06-10', '2024-09-17', '2024-10-10',
  '2025-01-01', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-28', '2025-04-03',
  '2025-04-04', '2025-05-01', '2025-05-30', '2025-10-06', '2025-10-10', '2026-01-01', '2026-02-16', '2026-02-17',
  '2026-02-18', '2026-02-19', '2026-02-20', '2026-03-02', '2026-04-03', '2026-04-06', '2026-05-01', '2026-06-19',
  '2026-09-25', '2026-10-09', '2026-10-10'
]);

export function isWeekendOrHoliday(date: Date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  const isoStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return TW_HOLIDAYS.has(isoStr);
}

export function getNextWorkingDay(date: Date) {
  let result = new Date(date);
  let deferredDays = 0;
  while (isWeekendOrHoliday(result)) {
    result.setDate(result.getDate() + 1);
    deferredDays++;
  }
  return { date: result, deferredDays };
}

/**
 * 假日表涵蓋的最後年份。
 * 計算跨到此年之後，該年國定假日不在表內，期間末日的休息日判斷將不可靠。
 */
export const HOLIDAY_TABLE_COVERAGE_END_YEAR = 2026;

/**
 * 假日表實際涵蓋的最後一日。
 *
 * 只看年份會高估涵蓋範圍：表內最後一筆是 2026-10-10，
 * 但以年份判斷會讓 2026-11-05 之後的期間也被視為「已涵蓋」，
 * 介面卻宣稱維護範圍至民國 115 年為止。
 * 實測當日為 2026-09-27 時，20 日上訴期限落在 2026-10-17，
 * 已在表外卻不會顯示任何超出範圍的警告。
 */
export const HOLIDAY_TABLE_LAST_COVERED_DATE = '2026-10-10';

export interface DeadlineResult {
  date: Date;
  deferredDays: number;
  /**
   * 期間末日落在假日表涵蓋範圍之外時為 true。
   * 這時休息日判斷不足以依賴，必須提醒使用者人工確認，
   * 否則期間末日可能算得太早而喪失上訴權利。
   */
  beyondHolidayCoverage: boolean;
}

/**
 * 該日期是否落在假日表實際涵蓋範圍之外。
 * 以表內最後一日為準，而非只看年份。
 */
export function isBeyondHolidayCoverage(date: Date): boolean {
  if (date.getFullYear() > HOLIDAY_TABLE_COVERAGE_END_YEAR) return true;
  if (date.getFullYear() < HOLIDAY_TABLE_COVERAGE_END_YEAR) return false;
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return iso > HOLIDAY_TABLE_LAST_COVERED_DATE;
}

export function calculateDeadline(
  recvDate: Date,
  statutoryDays: number,
  travelDays: number
): DeadlineResult {
  const deadline = new Date(recvDate);
  deadline.setDate(deadline.getDate() + statutoryDays + travelDays);
  const next = getNextWorkingDay(deadline);
  return {
    date: next.date,
    deferredDays: next.deferredDays,
    beyondHolidayCoverage: isBeyondHolidayCoverage(next.date)
  };
}
