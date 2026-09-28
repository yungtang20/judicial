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
        // 只判斷「完全沒有動態內容」的按鈕。
        //
        // 圖示按鈕的內容常寫成 {busy && <RefreshCw />}，靜態看不到文字；
        // 但內容若是 {hint}，文字在執行期才帶入，靜態同樣看不到。
        // 兩者用程式碼無法區分，因此只對「去除標籤後完全為空且不含 JSX 表達式」
        // 的按鈕提出要求，其餘屬靜態分析的限制，已於說明中標示。
        // 只檢查「靜態可判定」的按鈕：去除標籤後不含任何 JSX 表達式。
        //
        // 這是刻意的限制。圖示按鈕的內容有三種寫法：
        //   <Send className="w-4 h-4" />        靜態可判定為無文字
        //   {isLoading ? <A/> : <B/>}           文字執行期才決定，靜態看不出
        //   {entry.label}                       文字在變數裡，靜態也看不出
        // 後兩種若一律推定為「無文字」會產生誤報（側邊欄的導覽按鈕
        // 就是 {entry.label}，它明明有文字）。因此只對第一種提出要求，
        // 其餘需人工檢視。
        const textOnly = (m[2] || '').replace(/<[^>]*>/g, '');
        if (textOnly.includes('{')) continue;              // 內容為動態，靜態無法判定
        if (/[\u4e00-\u9fff]/.test(textOnly)) continue;   // 有可見中文
        if (/[A-Za-z]{2,}/.test(textOnly)) continue;       // 有可見文字
        if (/aria-label\s*=/.test(attrs)) continue;       // 有無障礙名稱
        if (/\btitle\s*=/.test(attrs)) continue;          // 有提示
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${path.relative(SRC, file)}:${line}`);
      }
    }
    expect(
      offenders,
      `以下純圖示按鈕沒有無障礙名稱：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
