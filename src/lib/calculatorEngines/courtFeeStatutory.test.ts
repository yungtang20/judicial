import { describe, expect, it } from 'vitest';
import { calculateCourtFee } from './statutoryStandards';

/**
 * 裁判費試算必須符合民訴法第77條之13 的累進費率。
 *
 * 費率：
 *   10萬元以下          1,000 元（固定額，不分段）
 *   逾10萬至100萬部分    每萬元 100 元
 *   逾100萬至1000萬部分   每萬元  90 元
 *   逾1000萬至1億部分    每萬元  80 元
 *   逾1億部分           每萬元  70 元
 *
 * 兩處容易出錯：
 * 1. 固定額涵蓋「前 10 萬」，只有超過 10 萬的部分才加徵。
 *    誤把費率套到全額，20 萬會算成 3,000（正確為 2,000）。
 * 2. 不足一個「萬元」單位時向上取整（Math.ceil）。
 *    100,001 元超出 10 萬 1 元，計 1 個單位 → 1,100。
 *
 * 本測試在寫作時曾因參考值算錯而誤報程式碼有誤——
 * 兩次都是測試的期望值錯，程式碼是對的。
 * 這裡以已核對的法定費率固定下來，防止日後有人「修正」成錯誤的算法。
 */
function 法定裁判費(訴訟標的: number): number {
  if (訴訟標的 <= 100000) return 1000;
  let 費 = 1000;
  let 剩 = 訴訟標的 - 100000;
  const 級距: Array<[number, number]> = [
    [900000, 100],
    [9000000, 90],
    [90000000, 80],
    [Infinity, 70],
  ];
  for (const [額度, 單價] of 級距) {
    if (剩 <= 0) break;
    const 取 = Math.min(剩, 額度);
    費 += Math.ceil(取 / 10000) * 單價;
    剩 -= 取;
  }
  return 費;
}

describe('裁判費試算', () => {
  it.each([
    [50000, 1000],
    [100000, 1000],
    [100001, 1100],
    [110000, 1100],
    [200000, 2000],
    [500000, 5000],
    [1000000, 10000],
    [1090000, 10810],
    [1500000, 14500],
    [5000000, 46000],
    [20000000, 171000],
    [100000000, 811000],
  ])('訴訟標的 %i 元 → 裁判費 %i 元', (標的, 預期) => {
    expect(calculateCourtFee(標的, 'first').fee).toBe(預期);
  });

  it('與獨立實作的法定費率函式一致', () => {
    // 兩份實作互相對照，避免同一個錯誤假設被當成正確。
    for (const 標的 of [50000, 200000, 500000, 3000000, 30000000, 250000000]) {
      expect(calculateCourtFee(標的, 'first').fee, `標的 ${標的}`).toBe(法定裁判費(標的));
    }
  });

  it('支付命令為 500 元（民訴法第77條之19）', () => {
    const r = calculateCourtFee(500000, 'payment_order');
    expect(r.fee).toBe(500);
    expect(r.basisRule).toContain('77');
  });

  it('零或負數標的不得收費', () => {
    expect(calculateCourtFee(0, 'first').fee).toBe(0);
    expect(calculateCourtFee(-100, 'first').fee).toBe(0);
  });

  it('費率隨標的金額單調遞增', () => {
    let 前 = 0;
    for (const 標的 of [100000, 200000, 500000, 1000000, 5000000, 20000000, 100000000]) {
      const r = calculateCourtFee(標的, 'first').fee;
      expect(r, `標的 ${標的} 的費率未遞增`).toBeGreaterThan(前);
      前 = r;
    }
  });

  it('固定額只涵蓋前 10 萬，不得套用到全額', () => {
    // 20 萬 = 1,000（固定）+ 10 萬×1% = 2,000
    // 若錯把費率套到全額會算成 1,000 + 20×100 = 3,000。
    expect(calculateCourtFee(200000, 'first').fee).toBe(2000);
  });
});
