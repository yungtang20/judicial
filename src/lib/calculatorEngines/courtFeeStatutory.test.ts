import { describe, expect, it } from 'vitest';
import { calculateCourtFee } from './statutoryStandards';
import { COURT_FEE_CALCULATOR_CONFIG } from './courtFee';

/**
 * 裁判費試算必須符合民訴法第77條之13 的累進費率。
 *
 * 費率取自司法院「民事事件費用徵收標準」對照表
 * （https://www.judicial.gov.tw/tw/cp-168-32-3645f-1.html ，更新日期 115-06-22）：
 *   10萬元以下              1,500 元（固定額，不分段）
 *   逾10萬至100萬部分       每萬元 130 元
 *   逾100萬至1000萬部分     每萬元 117 元
 *   逾1000萬至1億元部分     每萬元  88 元
 *   逾1億至10億元部分      每萬元  77 元
 *   逾10億元部分            每萬元  66 元
 *   畸零之數不滿萬元者以萬元計算
 *
 * 該表另載明的累計金額，可直接作為驗證點：
 *   100萬元 → 13,200 元；1000萬元 → 118,500 元；1億元 → 910,500 元
 *   表中範例：1,500萬元 → 500萬×88 ＋ 118,500 ＝ 162,500 元
 *
 * 重要：本檔先前釘住的是 1,000／100／90／80／70 這組費率，並註記
 * 「已核對的法定費率」。該組數字與司法院現行對照表不符，且當時的註記
 * 把錯誤參考值當成已核對結果，反而阻擋了後續修正。
 * 引用值必須以官方來源為準，不能以「程式碼是對的」為由保留。
 *
 * 另注意：依同法第77條之27，各法院得提高徵收額數（例如臺灣高等法院自
 * 113年底起對10萬元以下加徵十分之五、10萬至1000萬加徵十分之三、
 * 逾1000萬加徵十分之一），故本試算為法定基礎額，實際應以受理法院核定為準。
 */
function 法定裁判費(訴訟標的: number): number {
  if (訴訟標的 <= 100000) return 1500;
  let 費 = 1500;
  let 剩 = 訴訟標的 - 100000;
  const 級距: Array<[number, number]> = [
    [900000, 130],
    [9000000, 117],
    [90000000, 88],
    [900000000, 77],
    [Infinity, 66],
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
    [50000, 1500],
    [100000, 1500],
    [100001, 1630],
    [110000, 1630],
    [200000, 2800],
    [500000, 6700],
    [1000000, 13200],
    [1090000, 14253],
    [1500000, 19050],
    [5000000, 60000],
    [10000000, 118500],
    [15000000, 162500],
    [100000000, 910500],
  ])('訴訟標的 %i 元 → 裁判費 %i 元', (標的, 預期) => {
    expect(calculateCourtFee(標的, 'first').fee).toBe(預期);
  });

  it('與司法院對照表列明的累計金額一致', () => {
    // 這些數字直接抄自官方對照表，不經本專案推導，可作為獨立驗證點。
    expect(calculateCourtFee(1_000_000, 'first').fee).toBe(13_200);
    expect(calculateCourtFee(10_000_000, 'first').fee).toBe(118_500);
    expect(calculateCourtFee(100_000_000, 'first').fee).toBe(910_500);
  });

  it('重現官方對照表自行舉的範例（1,500萬元）', () => {
    // 官方範例：500(萬元)×88(元／萬) ＋ 118,500元 ＝ 162,500元
    expect(calculateCourtFee(15_000_000, 'first').fee).toBe(162_500);
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
    // 20 萬 = 1,500（固定）+ 10 萬×130元/萬 = 2,800
    // 若錯把費率套到全額會算成 1,500 + 20×130 = 4,100。
    expect(calculateCourtFee(200000, 'first').fee).toBe(2800);
  });

  it('basisRule 必須揭露民訴§77-27 的法院加徵差異', () => {
    // 各法院得依§77-27提高徵收額數，若不明示，使用者會誤以為金額全國一致。
    const r = calculateCourtFee(1000000, 'first');
    expect(r.basisRule).toContain('77條之27');
    expect(r.basisRule).toContain('受理法院');
  });

  it('非財產權訴訟費符合司法院對照表（第一審 4,500 元）', () => {
    // 司法院「民事事件費用徵收標準」：非因財產權起訴／上訴
    //   第一審 4,500 元；第二、三審 6,750 元。
    // 先前實作沿用加徵前的舊額 3,000 元，第一審少算 1,500 元。
    const 一審 = (COURT_FEE_CALCULATOR_CONFIG as any).calculate({
      claimAmount: 0, procedureType: 'first', isNonProperty: 'true', firstInstanceFeeReduced: 'true'
    });
    expect(一審.summary[0].value).toBe('$4,500');

    const 二審 = (COURT_FEE_CALCULATOR_CONFIG as any).calculate({
      claimAmount: 0, procedureType: 'second_third', isNonProperty: 'true', firstInstanceFeeReduced: 'true'
    });
    expect(二審.summary[0].value).toBe('$6,750');

    const 二審未酌減 = (COURT_FEE_CALCULATOR_CONFIG as any).calculate({
      claimAmount: 0, procedureType: 'second_third', isNonProperty: 'true', firstInstanceFeeReduced: 'false'
    });
    expect(二審未酌減.summary[0].value).toBe('$2,250');
  });

  it('使用者可見的說明文字不得出現加徵前的舊額 3,000 元', () => {
    // 說明文字與實際計算不同步時，使用者會依錯誤金額做財務規劃。
    const 全域說明 = JSON.stringify(COURT_FEE_CALCULATOR_CONFIG);
    expect(全域說明).not.toContain('3,000 元');
  });
});
