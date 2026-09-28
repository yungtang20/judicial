import { describe, expect, it } from 'vitest';
import { CALCULATOR_CONFIGS } from './index';

/**
 * 車輛零件折舊方法的正確性。
 *
 * 實測缺陷：程式註解宣稱「定率遞減法每年 0.369，殘值 10%」，
 * 但實際程式實作的是平均法（殘值 = 成本/6，直線折舊），
 * 註解與實作互相矛盾，維護者會誤以為程式已採定率遞減。
 * 副標題也宣稱「平均法/定率遞減法」有二選一，實際只有一種。
 *
 * 金額差異極大：零件 8 萬、車齡 2 年時
 *   定率遞減 0.369 → 31,853
 *   平均法          → 53,333
 * 相差 21,480 元（67%），直接影響與對造的談判金額。
 *
 * 經確認後改為：以定率遞減法為預設，並提供方法選單，
 * 結果中標示所用方法，讓使用者知道這個數字是怎麼來的。
 */
const 計算 = CALCULATOR_CONFIGS.TRAFFIC_COMPENSATION_CALCULATOR!;
const 跑 = (inputs: Record<string, unknown>) => {
  const r = calculate(inputs) as { summary?: Array<{ label?: string; value?: string; note?: string }> };
  const 項目 = r.summary?.find(s => s.label?.includes('折舊後現值'));
  return {
    數值: Number(String(項目?.value ?? '0').replace(/[$,]/g, '')),
    註記: 項目?.note ?? ''
  };
};
function calculate(inputs: Record<string, unknown>): unknown {
  return (計算 as unknown as { calculate: (i: Record<string, unknown>) => unknown }).calculate(inputs);
}

const 基準 = { partsExpense: '80000', laborExpense: '0', carAgeYears: '2' };

describe('車輛零件折舊', () => {
  it('預設為定率遞減法（0.369），與程式原本宣稱的意圖一致', () => {
    const r = 跑({ ...基準, depreciationMethod: 'DECLINING' });
    const 預期 = Math.round(80000 * Math.pow(1 - 0.369, 2));
    expect(Math.abs(r.數值 - 預期)).toBeLessThanOrEqual(2);
  });

  it('未指定方法時等同定率遞減法，不得默默套用較高的平均法', () => {
    // 未指定就落到平均法，等於使用者沒選擇就被索取更高金額。
    expect(跑({ ...基準 }).數值).toBe(跑({ ...基準, depreciationMethod: 'DECLINING' }).數值);
  });

  it('定率遞減法不得低於原價 10%', () => {
    for (const 年 of [5, 6, 8, 20]) {
      const r = 跑({ ...基準, carAgeYears: String(年), depreciationMethod: 'DECLINING' });
      expect(r.數值, `車齡 ${年} 年`).toBeGreaterThanOrEqual(8000 - 5);
    }
  });

  it('平均法保留為可選項，且確實與定率遞減法不同', () => {
    const 遞減 = 跑({ ...基準, depreciationMethod: 'DECLINING' }).數值;
    const 平均 = 跑({ ...基準, depreciationMethod: 'STRAIGHT_LINE' }).數值;
    expect(平均).toBeGreaterThan(遞減);
    // 平均法：殘值 = 80000/6，直線折舊 2 年
    expect(Math.abs(平均 - 53333)).toBeLessThanOrEqual(2);
  });

  it('無法辨識的方法值不得默默套用平均法，應回到預設的定率遞減', () => {
    const 亂填 = 跑({ ...基準, depreciationMethod: '不存在的' });
    expect(亂填.數值).toBe(跑({ ...基準, depreciationMethod: 'DECLINING' }).數值);
  });

  it('結果必須標示所用方法，讓使用者知道數字怎麼來的', () => {
    expect(跑({ ...基準, depreciationMethod: 'DECLINING' }).註記).toContain('定率遞減法');
    expect(跑({ ...基準, depreciationMethod: 'STRAIGHT_LINE' }).註記).toContain('平均法');
  });

  it('車齡 0 年不折舊', () => {
    expect(跑({ ...基準, carAgeYears: '0' }).數值).toBe(80000);
  });

  it('工資與烤漆費用不計入折舊', () => {
    // 最高法院見解：零件須折舊，工資與塗裝不折舊。
    const 僅工資 = calculate({ partsExpense: '0', laborExpense: '25000', carAgeYears: '2' }) as any;
    const 總額 = Number(String(僅工資.summary.find((s: any) => s.label.includes('車禍損害總估算額')).value).replace(/[$,]/g, ''));
    expect(總額).toBe(25000);
  });
});
