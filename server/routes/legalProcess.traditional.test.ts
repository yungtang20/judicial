import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese } from '../../src/lib/traditionalChineseGuard';

/**
 * 法理流程的路由與追問輸出會直接顯示給使用者，不得含簡體中文。
 *
 * 實測：/api/process/router 回傳的 missing_elements 出現
 * 「缺乏当事人資訊（人）」等簡體字，該清單在畫面上逐條呈現給使用者。
 */

/**
 * 剝除註解，只留下程式碼。
 * 註解可能引用實際觀察到的簡體字作為說明，不列入檢查。
 * 注意：CRLF 檔案中 `.` 在 JavaScript 不匹配 `\r`，
 * 因此不以 `$` 錨定行尾，直接用 `.*` 貪婪到底。
 */
function stripComments(src: string): string {
  return src
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*/, ''))
    .join('\n');
}

const CHINESE_STRING = /[「"']([^"'「」\r\n]{3,})[」"']/g;

describe('法理流程輸出的用字', () => {
  const code = stripComments(readFileSync(path.resolve(__dirname, 'legalProcess.ts'), 'utf8'));

  it('本檔的預設文案不得含簡體中文', () => {
    const literals = [...code.matchAll(CHINESE_STRING)]
      .map(m => m[1])
      .filter(v => /[一-鿿]/.test(v));
    const offenders = [...new Set(literals)].filter(v => containsSimplifiedChinese(v));
    expect(offenders, `以下預設文案含簡體中文：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('路由與追問節點都要有簡體中文防護', () => {
    expect(code).toContain('containsSimplifiedChinese(rawMessage)');
    expect(code).toContain('missingForDisplay.some(containsSimplifiedChinese)');
  });
});
