import { describe, expect, it } from 'vitest';
import { calculateCourtFee } from './calculatorEngines/statutoryStandards';
import { COURT_FEE_CALCULATOR_CONFIG } from './calculatorEngines/courtFee';

/**
 * 二審裁判費的比例以一審是否酌減為前提，不得當成無條件規則。
 *
 * 實測：民訴§77-16 的加徵 5/10 只適用於一審裁判費已依§77-9 酌減的情形；
 * 未酌減者原則上為一審裁判費之半。先前一律以 1.5 倍計算，
 * 並在說明中寫成「即一審之1.5倍」，等於把有前提的規定講成無條件，
 * 兩種情形金額相差可達四倍。
 */
describe('民事裁判費試算', () => {
  it('一審費率階梯符合民訴§77-13（司法院「民事事件費用徵收標準」對照表）', () => {
    expect(calculateCourtFee(0).fee).toBe(0);
    expect(calculateCourtFee(100000, 'first').fee).toBe(1500);
    // 100 萬：1,500 + 90 萬/1 萬 × 130 = 1,500 + 11,700 = 13,200
    expect(calculateCourtFee(1000000, 'first').fee).toBe(13200);
  });

  it('支付命令為定額 500 元', () => {
    expect(calculateCourtFee(500000, 'payment_order').fee).toBe(500);
  });

  it('二審比例必須依一審是否酌減而不同', () => {
    const 一審 = calculateCourtFee(1000000, 'first').fee;
    const 酌減後 = calculateCourtFee(1000000, 'second_third', true).fee;
    const 未酌減 = calculateCourtFee(1000000, 'second_third', false).fee;
    expect(酌減後).toBe(Math.round(一審 * 1.5));
    expect(未酌減).toBe(Math.round(一審 / 2));
    expect(酌減後).toBeGreaterThan(未酌減);
  });

  it('說明文字不得把有前提的比例講成無條件', () => {
    const 酌減 = calculateCourtFee(1000000, 'second_third', true).basisRule;
    const 未酌減 = calculateCourtFee(1000000, 'second_third', false).basisRule;
    expect(酌減).toContain('77條之9');
    expect(未酌減).toContain('77條之9');
    // 不得出現無條件的「即一審之1.5倍」
    expect(酌減).not.toContain('即一審之1.5倍');
  });

  it('試算器必須提供一審是否酌減的輸入', () => {
    const 輸入 = COURT_FEE_CALCULATOR_CONFIG.inputs.map(i => i.id);
    expect(輸入, '缺少一審是否酌減的條件輸入').toContain('firstInstanceFeeReduced');
  });

  it('兩種前提下的計算結果必須不同', () => {
    const cfg = COURT_FEE_CALCULATOR_CONFIG as unknown as {
      calculate: (i: Record<string, unknown>) => { summary: Array<{ label: string; value: string; note?: string }> };
    };
    const 酌減 = cfg.calculate({
      claimAmount: 1000000, procedureType: 'second_third', isNonProperty: 'false', firstInstanceFeeReduced: 'true'
    });
    const 未酌減 = cfg.calculate({
      claimAmount: 1000000, procedureType: 'second_third', isNonProperty: 'false', firstInstanceFeeReduced: 'false'
    });
    const 取 = (r: typeof 酌減, 標籤: string) => r.summary.find(s => s.label === 標籤)?.value;
    expect(取(酌減, '本階段應繳納裁判費')).not.toBe(取(未酌減, '本階段應繳納裁判費'));
  });
});
