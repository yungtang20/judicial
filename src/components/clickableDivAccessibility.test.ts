import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * 可點擊的 div 必須具備鍵盤與輔助技術可及性。
 *
 * 實測：分析歷史記錄的每一筆都是純 <div onClick>，
 * 沒有 role、tabIndex 與鍵盤處理，鍵盤與螢幕閱讀器使用者完全無法還原案件。
 */
const SRC = path.resolve(__dirname, '..');

function collectTsx(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectTsx(full, acc);
    else if (entry.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('可點擊 div 的鍵盤可及性', () => {
  const files = collectTsx(SRC).filter(f => !f.includes('.test.') && !f.includes('__tests__'));

  it('帶 onClick 且呈現為可點元素的 div，必須有 role 與 tabIndex', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // 逐字掃描 <div 的屬性區段，不用正則。
      //
      // 屬性裡可以出現任意深度的巢狀大括號與字串，例如
      // onKeyDown={(e) => { if (...) { ... } }}，其中還有字串 'Enter'。
      // 正則要表達這種巢狀幾乎不可能，實測舊寫法用 [^<>] 排除尖括號，
      // 結果漏掉所有箭頭函式寫法，掃描器形同虛設。
      for (let i = 0; i < src.length; i++) {
        if (!src.startsWith('<div', i)) continue;
        const after = src[i + 4];
        if (after && /[A-Za-z0-9]/.test(after)) continue;   // <divider 之類，不是 <div
        let depth = 0;
        let quote: string | null = null;
        let end = -1;
        for (let j = i + 4; j < src.length; j++) {
          const ch = src[j];
          if (quote) {
            if (ch === quote && src[j - 1] !== '\\') quote = null;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
          if (ch === '{') { depth++; continue; }
          if (ch === '}') { depth--; continue; }
          if (ch === '>' && depth === 0) { end = j; break; }
        }
        if (end < 0) continue;
        const attrs = src.slice(i + 4, end);
        if (!/onClick\s*=/.test(attrs)) continue;
        if (!/cursor-pointer/.test(attrs)) continue;   // 只檢查明確呈現為可點的元素
        if (/role\s*=/.test(attrs) && /tabIndex\s*=/.test(attrs)) continue;
        const line = src.slice(0, i).split('\n').length;
        offenders.push(`${path.relative(SRC, file)}:${line}`);
        i = end;
      }
    }
    expect(
      offenders,
      `以下可點擊的 div 缺少 role／tabIndex，鍵盤使用者無法操作：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
