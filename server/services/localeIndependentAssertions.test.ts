import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * 測試斷言不得依賴 ICU 版本相關的輸出。
 *
 * 背景：專案宣告 engines 為 Node 22.23.2，但部分開發環境是 Node 24，
 * 兩者綁定的 ICU 版本不同。實測同一個數字：
 *   Node 24（本機）：(20000).toLocaleString() → "20000"
 *   其他環境：       可能為 "20,000"
 *
 * 斷言若直接比對 toLocaleString() 的輸出，就會在特定 Node 版本上失敗，
 * 而被測行為本身完全正常——這是測試的脆弱性，不是產品的缺陷。
 *
 * 這裡掃描所有測試檔，找出会把 toLocaleString() 的結果拿來比對的地方。
 */
function 掃描測試檔(目錄: string, 累積: string[] = []): string[] {
  for (const 名稱 of readdirSync(目錄)) {
    if (名稱 === 'node_modules' || 名稱 === 'dist' || 名稱 === '.git' || 名稱 === 'build') continue;
    const 路徑 = join(目錄, 名稱);
    if (statSync(路徑).isDirectory()) 掃描測試檔(路徑, 累積);
    else if (/\.test\.tsx?$/.test(名稱)) 累積.push(路徑);
  }
  return 累積;
}

describe('測試斷言的地區獨立性', () => {
  const 測試檔 = [...掃描測試檔('server'), ...掃描測試檔('src')];

  it('確實掃描到測試檔（防空轉）', () => {
    expect(測試檔.length).toBeGreaterThan(20);
  });

  it('不得把 toLocaleString() 的輸出直接拿來比對字串內容', () => {
    // 允許「計算時使用」（如程式產生訊息），
    // 但測試斷言不得以它作為比對基準。
    const 問題: string[] = [];
    for (const 檔 of 測試檔) {
      const 內容 = readFileSync(檔, 'utf8');
      內容.split('\n').forEach((行, i) => {
        if (!/expect\(/.test(行)) return;
        if (!/toLocaleString\(\)|toLocaleDateString\(|toLocaleTimeString\(/.test(行)) return;
        問題.push(`${relative(process.cwd(), 檔)}:${i + 1}  ${行.trim().slice(0, 70)}`);
      });
    }
    expect(
      問題,
      '以下斷言以 toLocaleString 的輸出為比對基準，會因 ICU 版本而失敗：\n' + 問題.join('\n')
    ).toEqual([]);
  });

  it('應用程式碼可以使用 toLocaleString 產生面向使用者的訊息', () => {
    // 這是合理的：使用者看到的就是格式化後的數字。
    // 限制只針對測試斷言。
    const guard = readFileSync('server/services/inputLengthGuard.ts', 'utf8');
    expect(guard).toContain('toLocaleString');
  });
});
