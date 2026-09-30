import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese } from '../../src/lib/traditionalChineseGuard';
import { 套用繁體閘門 } from './legalProcess';

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

describe('繁體閘門的行為', () => {
  const 基本 = {
    domain: '民事',
    chapter: '民法債權租賃專節',
    cause: '返還押金',
    is_sensitive: false,
    is_complete: true,
    missing_elements: [] as string[],
  };

  it('輸出全為繁體時原樣保留，不得無謂改寫', () => {
    const r = 套用繁體閘門({ ...基本 });
    expect(r.chapter).toBe('民法債權租賃專節');
    expect(r.cause).toBe('返還押金');
  });

  it('chapter／cause 含簡體時必須實際轉換，不能只記錄', () => {
    // 「纠」為簡體。先前的守衛偵測到之後只替換 missing_elements，
    // chapter 原文照樣顯示給使用者——等於只記錄不修正。
    const r = 套用繁體閘門({ ...基本, chapter: '租賃纠紛', cause: '借贷纠纷' });
    expect(containsSimplifiedChinese(r.chapter), `chapter 仍含簡體：${r.chapter}`).toBe(false);
    expect(containsSimplifiedChinese(r.cause), `cause 仍含簡體：${r.cause}`).toBe(false);
    expect(r.chapter).toContain('糾');
  });

  it('domain 非允許值時回退為民事，不得盲目轉換', () => {
    // domain 只可能是刑事／民事／家事／行政。模型若吐出非法值，
    // 盲目轉換後仍不合法，會讓下游分流建立在錯誤前提上。
    const r = 套用繁體閘門({ ...基本, domain: '民事纠纷' });
    expect(['刑事', '民事', '家事', '行政']).toContain(r.domain);
  });

  it('missing_elements 含簡體時改用繁體預設', () => {
    const r = 套用繁體閘門({ ...基本, missing_elements: ['缺乏当事人資訊（人）'] });
    const 全部 = r.missing_elements.join('');
    expect(containsSimplifiedChinese(全部), `缺漏清單仍含簡體：${全部}`).toBe(false);
  });
});
