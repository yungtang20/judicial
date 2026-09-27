import { describe, expect, it } from 'vitest';
import {
  HOLIDAY_TABLE_LAST_COVERED_DATE,
  calculateDeadline,
  isBeyondHolidayCoverage
} from './deadlineCalculator';

/**
 * 假日表的涵蓋範圍必須反映實際建檔的最後一日，而非只看年份。
 *
 * 實測：假日表最後一筆是 2026-10-10，但原本以「年份 > 2026」判斷，
 * 使 2026-10-11 之後的期間都被當作已涵蓋，介面卻宣稱
 * 「維護範圍至民國 115 年為止」。
 * 當日為 2026-09-27 時，20 日上訴期限落在 2026-10-17，
 * 已在表外卻不會顯示任何超出範圍的警告。
 *
 * 期間末日若因未建檔的假日而算得太早，使用者會喪失上訴權利。
 */
describe('例假日表的涵蓋範圍', () => {
  it('涵蓋範圍的最後一日就是表內最後一筆', () => {
    expect(HOLIDAY_TABLE_LAST_COVERED_DATE).toBe('2026-10-10');
  });

  it('涵蓋範圍內的日期不算超出', () => {
    expect(isBeyondHolidayCoverage(new Date('2026-01-01T00:00:00'))).toBe(false);
    expect(isBeyondHolidayCoverage(new Date('2026-10-10T00:00:00'))).toBe(false);
    expect(isBeyondHolidayCoverage(new Date('2025-12-31T00:00:00'))).toBe(false);
  });

  it('同年度但晚於最後建檔日的日期算超出', () => {
    // 這是先前漏掉的情境：年份仍是 2026，卻已無假日建檔
    expect(isBeyondHolidayCoverage(new Date('2026-10-11T00:00:00'))).toBe(true);
    expect(isBeyondHolidayCoverage(new Date('2026-10-17T00:00:00'))).toBe(true);
    expect(isBeyondHolidayCoverage(new Date('2026-12-25T00:00:00'))).toBe(true);
  });

  it('晚於 2026 的年度一律算超出', () => {
    expect(isBeyondHolidayCoverage(new Date('2027-01-01T00:00:00'))).toBe(true);
  });

  it('20 日上訴期限落在 2026-10-17 時必須標示超出涵蓋範圍', () => {
    // 2026-09-27 送達，20 日期間末日為 2026-10-17
    const r = calculateDeadline(new Date('2026-09-27T00:00:00'), 20, 0);
    const iso = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`;
    expect(iso).toBe('2026-10-19');          // 10/17 為週六，順延至週一
    expect(r.beyondHolidayCoverage).toBe(true);
  });

  it('2026 年初的期間末日仍在涵蓋範圍內', () => {
    const r = calculateDeadline(new Date('2026-01-05T00:00:00'), 20, 0);
    expect(r.beyondHolidayCoverage).toBe(false);
  });
});
