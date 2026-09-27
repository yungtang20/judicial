import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * 品質計分卡必須只有一個檔案，且章節編號連續。
 *
 * 實測：多輪記錄時把檔名打成 QUALITY_SPORECARD.md（多一個 O），
 * 後續的內容全部寫進了錯誤的檔案，兩個檔案都被 commit 進版控。
 * 症狀是同一份文件在不同的工具下讀到不同內容——
 * shell 讀到正確檔、搜尋工具讀到打錯字的檔，
 * 而「檔案大小異常」也在兩者之間反覆出現。
 *
 * 這與專案一路在清理的問題同源：
 * 量測工具之間不一致，卻把結果當成結論。
 */
const DOCS = path.resolve(__dirname, '..', '..', 'docs', 'quality');
const 正確檔名 = 'QUALITY_SCORECARD.md';

describe('品質計分卡的檔案結構', () => {
  /**
   * 以編輯距離偵測近似檔名。
   *
   * 僅做正規化（去分隔符、轉小寫）不足以抓到單字內的拼字錯誤：
   * QUALITY_SCORECARD 正規化後為 qualityscorecard，
   * 而打錯字的 QUALITY_SPORECARD 為 qualitysporecard——
   * 兩者並非同名，正規化比對會漏掉。
   */
  const 編輯距離 = (a: string, b: string): number => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  };

  it('目錄中不得存在拼字相近的重複檔案', () => {
    const md = readdirSync(DOCS).filter(f => f.endsWith('.md'));
    const 可疑: string[] = [];
    for (let i = 0; i < md.length; i++) {
      for (let j = i + 1; j < md.length; j++) {
        const a = md[i].toLowerCase();
        const b = md[j].toLowerCase();
        if (a === b) continue;
        // 檔名相近（編輯距離 ≤ 2）且長度接近時，視為疑似重複
        if (Math.abs(a.length - b.length) <= 2 && 編輯距離(a, b) <= 2) {
          可疑.push(`${md[i]} ↔ ${md[j]}`);
        }
      }
    }
    expect(可疑, `疑似重複檔案：\n${可疑.join('\n')}`).toEqual([]);
  });

  it('計分卡必須存在於預期路徑', () => {
    expect(existsSync(path.join(DOCS, 正確檔名)), `缺少 ${正確檔名}`).toBe(true);
  });

  it('章節編號必須連續遞增，不得有重複或缺號', () => {
    const src = readFileSync(path.join(DOCS, 正確檔名), 'utf8');
    const 編號 = [...src.matchAll(/^### (\d+)\./gm)].map(m => Number(m[1]));
    expect(編號.length, '找不到任何實質章節').toBeGreaterThan(5);
    expect(編號, '章節編號應從 1 開始且連續遞增').toEqual(
      Array.from({ length: 編號.length }, (_, i) => i + 1)
    );
  });

  it('文件開頭必須是標題與評分日期', () => {
    const src = readFileSync(path.join(DOCS, 正確檔名), 'utf8');
    expect(src.startsWith('# Judicial Quality Scorecard')).toBe(true);
    expect(src.slice(0, 400)).toMatch(/評分日期：\d{4}-\d{2}-\d{2}/);
  });

  it('不得含有損壞的位元組或替代字元', () => {
    const src = readFileSync(path.join(DOCS, 正確檔名), 'utf8');
    // U+FFFD 替代字元代表編碼轉換時遺失的字元
    const 損壞 = [...src.matchAll(/�/g)];
    expect(損壞.length, `文件含有 ${損壞.length} 個替代字元，內容已損毀`).toBe(0);
  });

  it('現況證據區塊必須存在且數字非空', () => {
    const src = readFileSync(path.join(DOCS, 正確檔名), 'utf8');
    expect(src).toMatch(/## \d{4}-\d{2}-\d{2} 現況證據/);
    expect(src).toMatch(/個測試檔、\d+ 項測試/);
    expect(src).toContain('## Evidence ledger');
  });
});
