import { describe, expect, it } from 'vitest';
import { CALCULATOR_CONFIGS } from './index';
import { clampNonNegative, safeNumber } from './safeNumber';

/**
 * 計算器不得因異常輸入崩潰或產出 NaN。
 *
 * 實測邊界值壓測（112 組）發現兩類缺陷：
 * 1. STATUTE_LIMITATIONS_CALCULATOR 對非字串輸入呼叫 .trim() 與
 *    .startsWith()，直接拋 TypeError 讓整個計算器崩潰。
 * 2. 輸入 Infinity 時，扶養費與資遣費產出 NaN——
 *    Math.max(0, Number(Infinity) || 0) 仍是 Infinity（Infinity 為真值），
 *    金額欄位會顯示 $NaN，使用者無法判斷那代表什麼。
 *
 * 這些都是計算金額的工具，輸出錯或崩潰都直接影響使用者的判斷。
 */
const 極端輸入: Record<string, unknown> = {
  空字串: '',
  零: 0,
  負數: -10000,
  非數字字串: 'abc',
  undefined值: undefined,
  null值: null,
  極大值: 999999999999,
  正無窮大: Number.POSITIVE_INFINITY,
  負無窮大: Number.NEGATIVE_INFINITY,
  小數: 0.5,
  巨額字串: '9'.repeat(30),
  物件: {},
  陣列: [],
  布林: true,
};

describe('計算器的輸入邊界值', () => {
  const 工具清單 = Object.keys(CALCULATOR_CONFIGS);

  it('掃描確實涵蓋了所有計算器（防空轉）', () => {
    expect(工具清單.length).toBeGreaterThan(5);
  });

  it.each(工具清單)('%s 對所有極端輸入都不拋例外', (工具) => {
    const 設定 = CALCULATOR_CONFIGS[工具]!;
    const 欄位 = (設定.inputs || []).map((i) => i.id);
    for (const [名, 值] of Object.entries(極端輸入)) {
      const inputs: Record<string, unknown> = {};
      for (const f of 欄位) inputs[f] = 值;
      expect(
        () => 設定.calculate(inputs),
        `${工具} 遇到「${名}」時拋出例外`,
      ).not.toThrow();
    }
  });

  it.each(工具清單)('%s 的輸出不得含 NaN 或 Infinity', (工具) => {
    const 設定 = CALCULATOR_CONFIGS[工具]!;
    const 欄位 = (設定.inputs || []).map((i) => i.id);
    const 問題: string[] = [];
    for (const [名, 值] of Object.entries(極端輸入)) {
      const inputs: Record<string, unknown> = {};
      for (const f of 欄位) inputs[f] = 值;
      const 文字 = JSON.stringify(設定.calculate(inputs)) || '';
      if (文字.includes('NaN')) 問題.push(`${工具} [${名}] → NaN`);
      if (文字.includes('Infinity')) 問題.push(`${工具} [${名}] → Infinity`);
    }
    expect(問題, `以下組合產出無意義的數值：\n${問題.join('\n')}`).toEqual([]);
  });
});

describe('數值防護工具', () => {
  it('safeNumber 對無法解析的值回傳後備值', () => {
    expect(safeNumber(Infinity, -1)).toBe(-1);
    expect(safeNumber(-Infinity, -1)).toBe(-1);
    expect(safeNumber(NaN, -1)).toBe(-1);
    expect(safeNumber('abc', -1)).toBe(-1);
    expect(safeNumber(undefined, -1)).toBe(-1);
  });

  it('safeNumber 對有效數字原樣回傳', () => {
    expect(safeNumber(1234)).toBe(1234);
    expect(safeNumber('1234')).toBe(1234);
    expect(safeNumber(0)).toBe(0);
  });

  it('clampNonNegative 夾住負值與超限值', () => {
    expect(clampNonNegative(-100)).toBe(0);
    expect(clampNonNegative(50, 10)).toBe(10);
    expect(clampNonNegative(Infinity, 10, 5)).toBe(5);
  });
});
