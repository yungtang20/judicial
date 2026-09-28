import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';
import { TOOL_FIELD_SCHEMAS } from '../lib/toolFieldSchemas';

/**
 * 法院書狀上的日期不得硬寫年份。
 *
 * 實測缺陷：三處範本把「中華民國 115 年」寫死，只把月日用
 * new Date() 動態帶入。今天（民國115年）看起來正確，
 * 到了民國116年就會產出「中華民國 115 年 X 月 Y 日」——
 * 錯誤日期寫在法院書狀上，可能被退件或造成對方質疑。
 *
 * 正確寫法是 new Date().getFullYear() - 1911 動態計算。
 * toolboxFallbacks.ts 本來就是這樣寫的，辯護與判決分析的範本沒有跟上。
 *
 * 判準只針對「硬寫年份 + 動態月日」這個組合：
 * 純粹描述法律沿革的靜態年份（「民法自民國112年1月1日起…」）
 * 是歷史事實，寫死才正確，不在此限。
 */
const 掃描目錄 = ['src', 'server'];
const 硬寫年份 = /(?:中華民國|民國)\s*1[01]\d\s*年/g;
const 動態月日 = /\$\{[^}]*\}\s*月\s*\$\{/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// 注意：flatMap 會把索引當第二參數傳入，不能直接傳 walk。
const 檔案 = 掃描目錄.flatMap((d) => walk(d));

describe('書狀日期不得硬寫年份', () => {
  it('掃描確實涵蓋了原始碼（防空轉）', () => {
    expect(檔案.length).toBeGreaterThan(100);
  });

  it('範本不得硬寫民國年份搭配動態月日', () => {
    const 問題: string[] = [];
    for (const f of 檔案) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|import)/.test(line)) return;
        if (/placeholder|例如|範例|示範|sample|default|\\d\{|\\s\*/.test(line)) return;
        硬寫年份.lastIndex = 0;
        if (硬寫年份.test(line) && 動態月日.test(line)) {
          問題.push(`${f.replace(/\\/g, '/')}:${i + 1}`);
        }
      });
    }
    expect(問題, `硬寫民國年份但月日動態，明年起會產出錯誤日期：\n${問題.join('\n')}`).toEqual([]);
  });

  it('產出文件的落款為當年民國', () => {
    // 以實際產出驗證，而不只掃描原始碼。
    const 當年 = new Date().getFullYear() - 1911;
    const 有落款: string[] = [];
    let 檢查數 = 0;

    for (const [工具, 表單] of Object.entries(TOOL_FIELD_SCHEMAS)) {
      const params: Record<string, string> = {};
      for (const f of 表單) params[f.key] = /Amount|amount|Rent|rent|Salary/i.test(f.key) ? '50000' : '114年6月1日';
      const 文件 = buildFallbackToolboxResult(工具, params).documentText || '';
      const m = 文件.match(/中華民國\s*(\d{2,3})\s*年/);
      if (!m) continue;
      檢查數++;
      if (Number(m[1]) !== 當年) 有落款.push(`${工具}: 落款為民國 ${m[1]} 年，應為 ${當年} 年`);
    }

    expect(檢查數, '未找到任何含落款年度的產出，測試可能已失效').toBeGreaterThan(5);
    expect(有落款, `落款年份錯誤：\n${有落款.join('\n')}`).toEqual([]);
  });
});
