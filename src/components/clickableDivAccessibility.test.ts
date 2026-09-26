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
      // 找出 <div ... onClick ...> 且帶有 cursor-pointer 的元素
      const re = /<div\b((?:[^<>]|\{[^{}]*\})*?onClick=[^<>]*?)>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const attrs = m[1] || '';
        if (!/cursor-pointer/.test(attrs)) continue;   // 只檢查明確呈現為可點的元素
        if (/role\s*=/.test(attrs) && /tabIndex\s*=/.test(attrs)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${path.relative(SRC, file)}:${line}`);
      }
    }
    expect(
      offenders,
      `以下可點擊的 div 缺少 role／tabIndex，鍵盤使用者無法操作：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
