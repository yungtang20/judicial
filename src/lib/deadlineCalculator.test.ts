import { describe, it, expect } from 'vitest';
import { calculateDeadline, isWeekendOrHoliday, getNextWorkingDay } from './deadlineCalculator';

/**
 * 上訴期間計算的正確性。
 *
 * 風險等級最高的一項：期間算錯，使用者就直接喪失上訴權利。
 * 依民訴法第80條，期間末日為休息日時，期間於次一工作日終止。
 */
describe('上訴法定期間計算', () => {
  it('期間末日落在週日時延至次一工作日（民訴法第80條）', () => {
    // 2026-10-04 為週日
    expect(new Date(2026, 9, 4).getDay()).toBe(0);
    const r = calculateDeadline(new Date(2026, 9, 4), 0, 0);
    expect(r.date.getDay()).not.toBe(0);
    expect(r.date.getDay()).not.toBe(6);
  });

  it('期間末日落在週六時延至次一工作日', () => {
    // 2026-10-03 為週六
    expect(new Date(2026, 9, 3).getDay()).toBe(6);
    const r = calculateDeadline(new Date(2026, 9, 3), 0, 0);
    expect([1, 2, 3, 4, 5]).toContain(r.date.getDay());
  });

  it('期間末日為平日時不順延', () => {
    // 2026-10-06 為週二
    expect(new Date(2026, 9, 6).getDay()).toBe(2);
    const r = calculateDeadline(new Date(2026, 9, 6), 0, 0);
    expect(r.deferredDays).toBe(0);
  });

  it('在途期間會延長最後期限', () => {
    const noTravel = calculateDeadline(new Date(2026, 9, 6), 20, 0);
    const withTravel = calculateDeadline(new Date(2026, 9, 6), 20, 4);
    expect(withTravel.date.getTime()).toBeGreaterThan(noTravel.date.getTime());
  });

  it('法定期間為 20 日時自送達翌日起算', () => {
    // 送達 2026-10-06，翌日起算 20 日，末日應為 2026-10-26
    const r = calculateDeadline(new Date(2026, 9, 6), 20, 0);
    expect(r.date.getMonth()).toBe(9);
    expect(r.date.getDate()).toBe(26);
  });

  it('期間末日超出假日表涵蓋範圍時必須標記，讓使用者知道期限可能算得太早', () => {
    // 送出 2026-12-12，20 日期間正好落在 2027-01-01（元旦）。
    // 2027 年的國定假日不在表內，休息日判斷不可靠，期間末日可能偏早，
    // 使用者可能因此喪失上訴權利，因此必須標記而不是靜默輸出。
    const result = calculateDeadline(new Date(2026, 11, 12), 20, 0);
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.beyondHolidayCoverage).toBe(true);
  });

  it('涵蓋範圍內的期間不應被標記', () => {
    // 送出 2026-09-13，20 日期間末日為 2026-10-03，仍在假日表建檔範圍內。
    // 原先這裡用的是 2026-10-06，期限落在 10-26，已超出表內最後一筆
    // （2026-10-10），卻期望不被標記——那正是把只看年份的錯誤行為寫成期望。
    const result = calculateDeadline(new Date(2026, 8, 13), 20, 0);
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.date.getMonth()).toBe(9);
    expect(result.beyondHolidayCoverage).toBe(false);
  });

  it('同年度但晚於假日表最後建檔日的期間必須標記', () => {
    // 送出 2026-10-06，期限 2026-10-26。年份仍是 2026，
    // 但假日表僅建檔至 2026-10-10，該日之後的國定假日未納入計算。
    const result = calculateDeadline(new Date(2026, 9, 6), 20, 0);
    expect(result.beyondHolidayCoverage).toBe(true);
  });

  it('返回的型別包含順延天數與涵蓋標記', () => {
    const r = calculateDeadline(new Date(2026, 9, 3), 20, 0);
    expect(typeof r.deferredDays).toBe('number');
    expect(typeof r.beyondHolidayCoverage).toBe('boolean');
  });

  it('已知假日的辨識正確', () => {
    expect(isWeekendOrHoliday(new Date(2026, 0, 1))).toBe(true);  // 元旦
    expect(isWeekendOrHoliday(new Date(2026, 9, 10))).toBe(true); // 國慶日
    expect(isWeekendOrHoliday(new Date(2026, 9, 7))).toBe(false); // 週三平日
  });

  it('輸入日期不會被就地修改', () => {
    const input = new Date(2026, 9, 6);
    const before = input.getTime();
    calculateDeadline(input, 20, 4);
    expect(input.getTime()).toBe(before);
  });

  it('跨年計算不會產生非法日期', () => {
    const r = calculateDeadline(new Date(2026, 11, 20), 20, 4);
    expect(Number.isNaN(r.date.getTime())).toBe(false);
  });
});
