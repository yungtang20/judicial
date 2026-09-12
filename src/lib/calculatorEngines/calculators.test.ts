import { describe, expect, it } from 'vitest';
import { 
  REGIONAL_LIVING_EXPENSES_113, 
  calculateCourtFee, 
  formatCurrency 
} from './statutoryStandards';
import { CHILD_SUPPORT_CALCULATOR_CONFIG } from './childSupport';
import { COURT_FEE_CALCULATOR_CONFIG } from './courtFee';
import { INHERITANCE_PORTION_CALCULATOR_CONFIG } from './inheritancePortion';
import { RESIDUAL_PROPERTY_CALCULATOR_CONFIG } from './residualProperty';
import { TRAFFIC_COMPENSATION_CALCULATOR_CONFIG } from './trafficCompensation';
import { SEVERANCE_PAY_CALCULATOR_CONFIG } from './severancePay';
import { STATUTE_LIMITATIONS_CALCULATOR_CONFIG } from './statuteLimitations';

describe('Legal Calculator Engines Suite', () => {
  it('calculates court fee progressively according to civil litigation act', () => {
    // 10 萬元以下：1,000 元
    expect(calculateCourtFee(50000, 'first').fee).toBe(1000);
    // 100 萬元：10萬~100萬每萬100元 = 1000 + 90*100 = 10000 元
    expect(calculateCourtFee(1000000, 'first').fee).toBe(10000);
    // 支付命令固定 500 元
    expect(calculateCourtFee(1000000, 'payment_order').fee).toBe(500);
    // 二審上訴 1.5 倍
    expect(calculateCourtFee(1000000, 'second_third').fee).toBe(15000);
  });

  it('calculates child support based on regional average expenditure and income ratio', () => {
    const res = CHILD_SUPPORT_CALCULATOR_CONFIG.calculate({
      region: 'TAIPEI', // 34,321 元
      childCount: 1,
      childAge: 10,
      payerIncome: 60000,
      receiverIncome: 40000
    });

    // 總收入 100,000，給付方負擔 60%
    const expectedMonthly = Math.round(34321 * 0.6); // 20,593
    expect(res.summary[0].value).toBe(formatCurrency(expectedMonthly));
    expect(res.legalClause).toContain('未成年子女之扶養費');
    expect(res.legalClause).toContain('視為全部到期');
  });

  it('calculates inheritance portion and forced share', () => {
    const res = INHERITANCE_PORTION_CALCULATOR_CONFIG.calculate({
      estateTotal: 12000000,
      hasSpouse: 'true',
      order: 'ORDER_1_CHILDREN',
      heirCount: 2
    });

    // 配偶 + 2 子女 = 3 等分，每人應繼分 4,000,000；特留分 1/2 = 2,000,000
    expect(res.summary.length).toBe(3);
    expect(res.summary[0].value).toBe(formatCurrency(4000000));
    expect(res.summary[0].note).toContain('特留分底線保障額：$2,000,000');
  });

  it('calculates residual property division with 50% difference', () => {
    const res = RESIDUAL_PROPERTY_CALCULATOR_CONFIG.calculate({
      husbandAsset: 10000000,
      husbandDebt: 2000000, // 淨值 800萬
      wifeAsset: 3000000,
      wifeDebt: 1000000 // 淨值 200萬
    });

    // 差額 600 萬，半數 300 萬由夫給付妻
    expect(res.summary[0].value).toBe(formatCurrency(3000000));
    expect(res.summary[0].note).toContain('由【夫方】給付予【妻方】');
  });

  it('calculates traffic compensation with vehicle parts depreciation and fault deduction', () => {
    const res = TRAFFIC_COMPENSATION_CALCULATOR_CONFIG.calculate({
      medicalExpenses: 20000,
      nursingFee: 30000,
      workLoss: 50000,
      solatium: 50000,
      partsExpense: 30000,
      laborExpense: 20000,
      carAgeYears: 3,
      myFaultRatio: 30 // 我方 30% 肇責，向對方請求 70%
    });

    expect(res.summary[0].note).toContain('70%');
    expect(res.legalClause).toContain('撤回（或不再提起）刑事過失傷害之告訴');
  });

  it('calculates severance pay according to labor pension act', () => {
    const res = SEVERANCE_PAY_CALCULATOR_CONFIG.calculate({
      monthlySalary: 60000,
      seniorityYears: 4,
      seniorityMonths: 0,
      seniorityDays: 0,
      unusedLeaveDays: 10
    });

    // 4 年 × 0.5 = 2 個月 = 120,000
    // 滿 3 年預告期 30 天 = 60,000
    // 特休 10 天 = 20,000
    // 總計 = 200,000
    expect(res.summary[1].value).toBe(formatCurrency(120000));
    expect(res.summary[2].value).toBe('30 天');
    expect(res.summary[0].value).toBe(formatCurrency(200000));
  });

  it('calculates statute of limitations correctly', () => {
    const res = STATUTE_LIMITATIONS_CALCULATOR_CONFIG.calculate({
      legalDomain: 'CIVIL_GENERAL',
      startDate: '2020-01-01'
    });

    // 15 年後 -> 2035 年 01 月 01 日
    expect(res.summary[0].value).toContain('2035 年 01 月 01 日');
    expect(res.legalClause).toContain('民法第125條');
  });
});
