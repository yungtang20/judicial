import { describe, expect, it } from 'vitest';
import { calculateDeadline, isBeyondHolidayCoverage } from './deadlineCalculator';

/**
 * 期間計算的邊界情況。
 *
 * 這是上訴權利能否保全的計算——算得比法院早一天就可能喪失權利，
 * 因此跨年、閏年、月底與週末順延都必須逐一驗證。
 *
 * 驗算基準：期間以日計算者，依民訴第120條自發送日之翌日起算（初日不計）。
 */
const 民國 = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const 週幾 = (d: Date): string => '日一二三四五六'[d.getDay()];

describe('法定期間計算的邊界情況', () => {
  it('跨年：12/20 送達，20 日末日為隔年 1/9（週六）→ 順延至 1/11', () => {
    const r = calculateDeadline(new Date(2026, 11, 20), 20, 0);
    expect(民國(r.date)).toBe('2027-01-11');
    expect(r.deferredDays).toBe(2);
  });

  it('跨年：12/25 送達，末日 1/14 為平日 → 不順延', () => {
    const r = calculateDeadline(new Date(2026, 11, 25), 20, 0);
    expect(民國(r.date)).toBe('2027-01-14');
    expect(r.deferredDays).toBe(0);
  });

  it('閏年：2028/2/10 送達，20 日末日須正確跨過 2/29', () => {
    const r = calculateDeadline(new Date(2028, 1, 10), 20, 0);
    expect(民國(r.date)).toBe('2028-03-01');
  });

  it('非閏年：2027/2/10 送達，末日為 3/2（與閏年相差一天）', () => {
    const r = calculateDeadline(new Date(2027, 1, 10), 20, 0);
    expect(民國(r.date)).toBe('2027-03-02');
  });

  it('月底：1/25 送達，末日 2/14 為週日 → 順延一天', () => {
    const r = calculateDeadline(new Date(2027, 0, 25), 20, 0);
    expect(民國(r.date)).toBe('2027-02-15');
    expect(r.deferredDays).toBe(1);
  });

  it('短月份後：1/31 送達，末日 2/20 為週六 → 順延至 2/22', () => {
    const r = calculateDeadline(new Date(2027, 0, 31), 20, 0);
    expect(民國(r.date)).toBe('2027-02-22');
  });

  it('加上在途天數後才起算順延', () => {
    // 2026-09-27 送達，20 日法定 + 5 日在途 → 末日 2026-10-22（週四）
    const r = calculateDeadline(new Date(2026, 8, 27), 20, 5);
    expect(民國(r.date)).toBe('2026-10-22');
    expect(r.deferredDays).toBe(0);
  });

  it('順延不得跨越到下一個月而未計入', () => {
    // 12/31 送達，20 日末日落在 1/19 附近
    const r = calculateDeadline(new Date(2026, 11, 31), 20, 0);
    expect(r.date.getMonth(), '跨年後的月份計算錯誤').toBe(0);
    expect(r.date.getFullYear()).toBe(2027);
  });

  it('各案例的順延結果須與實際星期相符', () => {
    const 案例: Array<[Date, number, number]> = [
      [new Date(2026, 11, 20), 20, 0],
      [new Date(2027, 0, 25), 20, 0],
      [new Date(2027, 0, 31), 20, 0],
      [new Date(2026, 8, 27), 20, 0]
    ];
    for (const [送達, 天數, 在途] of 案例) {
      const r = calculateDeadline(送達, 天數, 在途);
      const 週 = r.date.getDay();
      expect(週 === 0 || 週 === 6, `${民國(r.date)} 為週${週幾(r.date)}，不應成為最終期限`).toBe(false);
    }
  });
});

describe('假日表涵蓋範圍的邊界', () => {
  it('2026-10-10 為涵蓋範圍的最後一日', () => {
    expect(isBeyondHolidayCoverage(new Date(2026, 9, 10))).toBe(false);
  });

  it('2026-10-11 起即超出涵蓋範圍', () => {
    expect(isBeyondHolidayCoverage(new Date(2026, 9, 11))).toBe(true);
  });

  it('2027 年一律超出涵蓋範圍（含春節等未建檔假日）', () => {
    // 2027 春節約在 2/6，該年度國定假日不在表內，
    // 落在春節的期間末日必須被標示，不能靜默算錯。
    for (const 月 of [1, 2, 5, 9, 11]) {
      expect(isBeyondHolidayCoverage(new Date(2027, 月, 15))).toBe(true);
    }
  });

  it('2025 及更早仍在涵蓋範圍內', () => {
    expect(isBeyondHolidayCoverage(new Date(2025, 5, 1))).toBe(false);
    expect(isBeyondHolidayCoverage(new Date(2024, 0, 1))).toBe(false);
  });
});
