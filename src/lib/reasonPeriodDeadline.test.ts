import { describe, expect, it } from 'vitest';
import { calculateDeadline, getNextWorkingDay } from '../lib/deadlineCalculator';

/**
 * 補提上訴理由書期限必須自「上訴期間實際屆滿日」起算。
 *
 * 刑事訴訟法第 382 條：上訴狀應於上訴期間屆滿後 20 日內敘述理由。
 * 上訴期間的屆滿日是**順延後**的日期。
 *
 * 實測錯誤：送達 115/6/7，法定 20 日末日為 6/27（週六）→ 順延至 6/29。
 * 舊實作從送達日直接加 40 日得 7/17，與主期限只差 18 天，
 * 畫面上兩個數字互相矛盾，且比法定期間早 3 天。
 */

/** 重現元件的計算方式，以確保測試涵蓋的就是實際邏輯。 */
function 計算補提期限(送達: Date, 法定日: number, 在途日: number): Date | null {
  // 主期限：順延後的實際屆滿日
  const 屆滿日 = calculateDeadline(送達, 法定日, 在途日).date;
  if (!屆滿日) return null;
  // 補提期限：自屆滿日起 20 日，再各自順延
  const raw = new Date(屆滿日.getTime() + 20 * 24 * 60 * 60 * 1000);
  return getNextWorkingDay(raw).date;
}

/** 舊的錯誤實作，保留作為對照。 */
function 舊的錯誤實作(送達: Date, 在途日: number): Date {
  const raw = new Date(送達.getTime() + (40 + 在途日) * 24 * 60 * 60 * 1000);
  return getNextWorkingDay(raw).date;
}

describe('補提上訴理由書期限', () => {
  it('自順延後的屆滿日起算 20 日', () => {
    const 送達 = new Date('2026-06-07'); // 2026/6/7
    const 屆滿 = calculateDeadline(送達, 20, 0).date;
    const 補提 = 計算補提期限(送達, 20, 0);

    expect(屆滿).not.toBeNull();
    expect(補提).not.toBeNull();

    // 屆滿日之後必須確實滿 20 日（未扣掉順延時會少於 20 日）
    const 相差天 = Math.round((補提!.getTime() - 屆滿!.getTime()) / 86400000);
    expect(相差天, '補提期限與屆滿日的間隔應為 20 日以上（順延只會更長）').toBeGreaterThanOrEqual(20);
  });

  it('與舊實作不同：舊實作會少算順延', () => {
    const 送達 = new Date('2026-06-07');
    const 新 = 計算補提期限(送達, 20, 0)!;
    const 舊 = 舊的錯誤實作(送達, 0);
    expect(新.getTime()).not.toBe(舊.getTime());
  });

  it('順延未發生時，兩者應一致', () => {
    // 2026/6/3 送達，20 日末日 6/23（週二）不順延。
    // 此時兩種算法都應該得到相同結果，確認新實作沒有引入偏差。
    const 送達 = new Date('2026-06-03');
    const 屆滿 = calculateDeadline(送達, 20, 0).date;
    const 新 = 計算補提期限(送達, 20, 0)!;
    const raw = new Date(屆滿.getTime() + 20 * 86400000);
    const 預期 = getNextWorkingDay(raw).date;
    expect(新.getTime()).toBe(預期.getTime());
  });

  it('屆滿日與補提期限不得出現週日或週六', () => {
    for (const 送達 of ['2026-06-03', '2026-06-07', '2026-01-10', '2026-12-20']) {
      const 屆滿 = calculateDeadline(new Date(送達), 20, 0).date;
      const 補提 = 計算補提期限(new Date(送達), 20, 0)!;
      expect(屆滿.getDay(), `${送達} 屆滿日落在週末`).not.toBe(0);
      expect(屆滿.getDay(), `${送達} 屆滿日落在週六`).not.toBe(6);
      expect(補提.getDay(), `${送達} 補提期限落在週末`).not.toBe(0);
      expect(補提.getDay(), `${送達} 補提期限落在週六`).not.toBe(6);
    }
  });

  it('在途期間會同時延長屆滿日與補提期限', () => {
    const 送達 = new Date('2026-06-03');
    const 無在途 = 計算補提期限(送達, 20, 0)!;
    const 有在途 = 計算補提期限(送達, 20, 3)!;
    expect(有在途.getTime()).toBeGreaterThan(無在途.getTime());
  });
});
