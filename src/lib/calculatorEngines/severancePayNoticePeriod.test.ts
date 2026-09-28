import { describe, expect, it } from 'vitest';
import { SEVERANCE_PAY_CALCULATOR_CONFIG } from './severancePay';

/**
 * 預告期級距必須符合勞動基準法第16條第2項。
 *
 *   滿3年以上      → 30 日
 *   滿1年未滿3年   → 20 日
 *   滿6個月未滿1年 → 10 日
 *   未滿6個月      → 5 日
 *
 * 實測缺陷：
 * 1. 門檻寫成 3/12（3 個月）而非法定的 6 個月——
 *    年資 3~6 個月的勞工多算 5 日預告工資。
 * 2. else 分岐給 0 日，漏掉「未滿6個月應預告 5 日」這一級——
 *    年資未滿 6 個月的勞工直接少領 5 日工資。
 *    這是勞工最需要錢的時候少算，影響最直接。
 *
 * 注意：先前的「未滿三個月無預告期」註記也印證了實作者誤以為門檻是 3 個月。
 */
const 計算 = (年: number, 月 = 0, 日 = 0) =>
  SEVERANCE_PAY_CALCULATOR_CONFIG.calculate({
    monthlySalary: 50000,
    seniorityYears: 年,
    seniorityMonths: 月,
    seniorityDays: 日,
    unusedLeaveDays: 0,
  });

const 預告日數 = (結果: { summary: Array<{ label: string; value: string }> }) =>
  Number(結果.summary.find((s) => s.label === '法定預告期間')!.value.replace(/\D/g, ''));

describe('預告期級距（勞基法第16條第2項）', () => {
  it.each([
    [3, 0, 0, 30, '滿3年'],
    [5, 0, 0, 30, '滿5年'],
    [2, 0, 0, 20, '滿2年'],
    [1, 0, 0, 20, '剛滿1年'],
    [0, 11, 0, 10, '滿11個月'],
    [0, 6, 0, 10, '剛滿6個月'],
    [0, 5, 0, 5, '滿5個月（未滿6個月）'],
    [0, 3, 0, 5, '滿3個月（未滿6個月）'],
    [0, 0, 1, 5, '剛滿1個月'],
    [0, 0, 0, 5, '剛到職'],
  ])('年資 %i年%i月%i日 → 預告 %i 日（%s）', (年, 月, 日, 預期) => {
    expect(預告日數(計算(年 as number, 月 as number, 日 as number))).toBe(預期);
  });

  it('任何年資都不得為 0 日', () => {
    // 勞基法未設「無預告期」的級距，最少也有 5 日。
    // 先前實作在未滿 3 個月時給 0 日，等於讓勞工少領 5 日工資。
    for (const [年, 月, 日] of [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]] as const) {
      expect(預告日數(計算(年, 月, 日)), `年資 ${年}年${月}月${日}日`).toBeGreaterThan(0);
    }
  });

  it('預告期隨年資單調遞增', () => {
    let 前 = 0;
    for (const [年, 月] of [[0, 0], [0, 6], [1, 0], [3, 0]] as const) {
      const d = 預告日數(計算(年, 月, 0));
      expect(d, `年資 ${年}年${月}月`).toBeGreaterThan(前);
      前 = d;
    }
  });

  it('資遣費基數最高以 6 個月為限（勞退新制第12條）', () => {
    const 超長年資 = 計算(20);
    const 剛滿12年 = 計算(12);
    const 金額 = (r: typeof 超長年資) =>
      Number(r.summary.find((s) => s.label === '新制法定資遣費金額')!.value.replace(/\D/g, ''));
    expect(金額(超長年資)).toBe(金額(剛滿12年));
  });
});
