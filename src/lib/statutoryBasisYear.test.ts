import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { REGIONAL_LIVING_EXPENSES_BASIS_YEAR, REGIONAL_LIVING_EXPENSES_113 } from './calculatorEngines/statutoryStandards';

/**
 * 法定金額必須揭露基準年度。
 *
 * 實測：扶養費計算採用行政院主計總處 113 年度（2024）的消費支出標準，
 * 畫面卻只寫「依臺北市 主計總處標準」，沒有年度。
 * 主計總處每年公布新標準，未更新資料時不標示年度，
 * 使用者會把兩年前的數字當成現值——
 * 而這項金額會進入扶養費的實際計算，並可能被寫進書狀。
 *
 * 與例假日表涵蓋範圍是同一類問題：
 * 資料過期不一定能立刻修正，但絕不能假裝它是現值。
 */
const 計算器目錄 = path.resolve(__dirname, 'calculatorEngines');

describe('法定金額的基準年度必須揭露', () => {
  it('必須提供基準年度常數', () => {
    expect(REGIONAL_LIVING_EXPENSES_BASIS_YEAR).toBeTruthy();
    expect(REGIONAL_LIVING_EXPENSES_BASIS_YEAR).toMatch(/^\d{2,3} 年度$/);
  });

  it('扶養費計算結果必須標示基準年度', () => {
    const src = readFileSync(path.join(計算器目錄, 'childSupport.ts'), 'utf8');
    expect(src, '扶養費未引用基準年度常數').toMatch(/REGIONAL_LIVING_EXPENSES_BASIS_YEAR/);
    // 使用者看得到的說明文字必須含年度
    expect(src).toMatch(/主計總處 \$\{REGIONAL_LIVING_EXPENSES_BASIS_YEAR\} 標準/);
  });

  it('資料過期時必須明確告知，而非假裝是現值', () => {
    const src = readFileSync(path.join(計算器目錄, 'childSupport.ts'), 'utf8');
    expect(src, '缺少非最新年度的提醒').toMatch(/非最新年度|請自行核對/);
  });

  it('各縣市金額皆為正整數', () => {
    for (const [key, v] of Object.entries(REGIONAL_LIVING_EXPENSES_113)) {
      expect(Number.isInteger(v.amount), `${key} 金額非整數`).toBe(true);
      expect(v.amount, `${key} 金額非正值`).toBeGreaterThan(0);
      expect(v.name, `${key} 缺少名稱`).toBeTruthy();
    }
  });
});
