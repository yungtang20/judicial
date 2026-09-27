import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { assessProceduralRequirements } from './rules/proceduralLawEngine';

/**
 * 法定期限日期必須以本地民用時間輸出。
 *
 * 實測：`toISOString().slice(0, 10)` 會轉成 UTC，在 UTC+8 下
 * 輸入時間早於 08:00 時會整整少一天：
 *   2026-09-28T07:00:00 + 30 日 → 2026-10-27（應為 2026-10-28）
 *   2026-09-28T00:30:00 + 30 日 → 2026-10-27（應為 2026-10-28）
 *
 * 這是家事程序評估中的法定期限，差一天可能造成期限誤判。
 * 專案的 forensicGuidance.ts 早已記載此陷阱並提供 toCalendarDate，
 * 但另有三處仍直接使用 toISOString。
 */
describe('法定期限的時區正確性', () => {
  const 應為 = '2026-10-28';

  it.each([
    ['無時間（純日期）', '2026-09-28'],
    ['凌晨 00:30', '2026-09-28T00:30:00'],
    ['上午 07:00（UTC 跨界點之前）', '2026-09-28T07:00:00'],
    ['上午 08:00（UTC 跨界點）', '2026-09-28T08:00:00'],
    ['下午 20:00', '2026-09-28T20:00:00'],
    ['深夜 23:59', '2026-09-28T23:59:00']
  ])('收受日為 %s 時，30 日期限一律為 %s', (_說明, 輸入) => {
    const r = assessProceduralRequirements('FAMILY', 輸入, 30);
    expect(r.deadline.dueDate, `${輸入} 算出的期限錯誤`).toBe(應為);
  });

  it('不得因輸入時間而改變同一日的期限', () => {
    const 各時段 = ['00:00:00', '07:59:00', '08:00:00', '12:00:00', '23:59:00'];
    const 結果 = new Set(各時段.map(t => assessProceduralRequirements('FAMILY', `2026-09-28T${t}`, 30).deadline.dueDate));
    expect(結果.size, '同一日的期限不應因時間不同而改變').toBe(1);
  });
});

describe('全面禁止以 UTC 取法定期限日期', () => {
  const SRC = path.resolve(__dirname, '..');

  const 收集 = (dir: string, acc: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', 'dist'].includes(entry) || entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) 收集(full, acc);
      else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) acc.push(full);
    }
    return acc;
  };

  // 必須先剝除註解再掃描：說明這個陷阱的註解本身就含有該字串，
  // 不剝除會把警告文字誤判為違規（先前的字串掃描即栽在這一點）。
  const 剝除註解 = (src: string): string =>
    src
      .replace(/\r\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');

  it('不得出現 toISOString().slice(0, 10) 取日期的寫法', () => {
    const 違規: string[] = [];
    for (const 檔 of 收集(SRC)) {
      const 行 = 剝除註解(readFileSync(檔, 'utf8')).split('\n');
      行.forEach((l, i) => {
        if (/toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/.test(l)) {
          違規.push(`${path.relative(SRC, 檔)}:${i + 1}  ${l.trim().slice(0, 70)}`);
        }
      });
    }
    expect(違規, `以下以 UTC 取日期，UTC+8 下可能整整差一天：\n${違規.join('\n')}`).toEqual([]);
  });
});
