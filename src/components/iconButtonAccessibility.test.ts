import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * 純圖示按鈕必須有可讀名稱。
 *
 * 實測：律師對話助理的「送出問題」是本頁主要動作，卻是沒有 aria-label
 * 的純圖示按鈕，螢幕閱讀器使用者完全無法送出問題。
 */
const SRC = path.resolve(__dirname, '..');
const COMPONENT_DIR = path.resolve(__dirname);

function collectTsx(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectTsx(full, acc);
    else if (entry.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('純圖示按鈕的無障礙名稱', () => {
  const files = collectTsx(SRC).filter(f => !f.includes('.test.') && !f.includes('__tests__'));

  it('所有沒有文字內容的按鈕都必須有 aria-label 或 title', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // 比對 <button ...> 區塊，找出既無文字內容、也無 aria-label/title 的
      const buttonRe = /<button\b([\s\S]{0,600}?)(?:\/>|>([\s\S]{0,900}?)<\/button>)/g;
      let m: RegExpExecArray | null;
      while ((m = buttonRe.exec(src)) !== null) {
        const attrs = m[1] || '';
        const inner = (m[2] || '').replace(/<[^>]*>/g, '').trim();
        if (inner.length > 0) continue;                 // 有可見文字
        if (/aria-label\s*=/.test(attrs)) continue;      // 有無障礙名稱
        if (/\btitle\s*=/.test(attrs)) continue;         // 有提示
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${path.relative(SRC, file)}:${line}`);
      }
    }
    expect(
      offenders,
      `以下純圖示按���沒有無障礙名稱：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
