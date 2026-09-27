import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese } from './traditionalChineseGuard';

/**
 * 繁體中文防護必須涵蓋 JSX 元素文字。
 *
 * 實測：防護只擷取引號包住的字串常值，
 * 而 React 中使用者可見的中文有相當比例寫成 JSX 文字節點
 * （<div>不当得利的说明文字</div>），這種寫法完全抓不到。
 *
 * 繁體中文是專案的硬性法律要求（台灣法律文件不得以簡體中文交付），
 * 漏掃等於放行。
 */

/** 複製防護測試中的擷取邏輯，確保此測試檢驗的是同一套規則。 */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '__tests__'].includes(entry) || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectSourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

const SRC = path.resolve(__dirname, '..');

const stripComments = (src: string): string =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');

/** 與防護測試相同的擷取規則。 */
function extractUserFacingText(code: string, isTsx: boolean): string[] {
  const literals = [...code.matchAll(/[「"']([^"'「」\r\n]{3,})[」"']/g)].map(m => m[1]);
  if (isTsx) {
    for (const m of code.matchAll(/>([^<>{}]*[一-鿿][^<>{}]*)</g)) literals.push(m[1]);
  }
  return [...new Set(literals.map(v => v.trim()))].filter(Boolean);
}

describe('繁體中文防護的擷取規則', () => {
  it('必須擷取 JSX 元素文字，不只是字串常值', () => {
    const jsx = 'const a = <div>不当得利的说明文字</div>;';
    const 字串 = extractUserFacingText('const a = "不当得利的说明文字";', true);
    const 元素 = extractUserFacingText(jsx, true);
    expect(字串.length).toBeGreaterThan(0);
    expect(元素.length, 'JSX 元素文字必須被擷取').toBeGreaterThan(0);
    expect(元素.some(v => containsSimplifiedChinese(v))).toBe(true);
  });

  it('不得對 .ts 檔套用 JSX 文字規則（會誤判箭頭函式）', () => {
    // .ts 中的 > 來自箭頭函式，例如 new Map([...] => ...)
    const 箭頭程式碼 = 'const m = new Map([\n  ["书", "書"],\n]);';
    const 結果 = extractUserFacingText(箭頭程式碼, false);
    expect(結果.some(v => containsSimplifiedChinese(v))).toBe(false);
  });

  it('防護測試本身必須含 JSX 文字掃描分支', () => {
    const src = readFileSync(path.join(SRC, 'lib/aiOutputTraditionalGuard.test.ts'), 'utf8');
    expect(src, '防護缺少 JSX 文字節點的掃描').toMatch(/JSX 元素文字/);
    expect(src, '防護未限定 JSX 掃描僅適用於 .tsx').toMatch(/\.tsx\$\/\.test\(full\)/);
  });

  it('防護必須同時掃描字串常值與 JSX 文字兩種來源', () => {
    const 樣本 = stripComments(`
      const a = "不当得利的说明文字甲";
      const b = <p>不当得利的说明文字乙</p>;
    `);
    const 取得 = extractUserFacingText(樣本, true);
    expect(取得.filter(v => containsSimplifiedChinese(v)).length)
      .toBeGreaterThanOrEqual(2);
  });
});

describe('實際掃描結果', () => {
  it('src/ 底下的 .tsx 檔必須納入掃描範圍', () => {
    const 檔案 = collectSourceFiles(SRC);
    const tsx = 檔案.filter(f => f.endsWith('.tsx'));
    expect(tsx.length, 'src/ 下沒有 .tsx 檔，掃描範圍的假設已過時').toBeGreaterThan(10);
  });

  it('目前 src/ 底下沒有含簡體中文的 JSX 文字', () => {
    const 問題: string[] = [];
    for (const 檔 of collectSourceFiles(SRC)) {
      const code = stripComments(readFileSync(檔, 'utf8'));
      for (const v of extractUserFacingText(code, 檔.endsWith('.tsx'))) {
        if (containsSimplifiedChinese(v)) 問題.push(`${path.relative(SRC, 檔)}: ${v.slice(0, 40)}`);
      }
    }
    expect(問題, `以下使用者可見文案含簡體中文：\n${問題.join('\n')}`).toEqual([]);
  });
});
