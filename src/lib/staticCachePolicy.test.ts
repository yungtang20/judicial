// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * 正式環境的靜態資源快取策略。
 *
 * 實測：`express.static` 未設定時預設為 `Cache-Control: public, max-age=0`，
 * 導致使用者每次載入都要對每個資源重新驗證。
 * Vite 產生的 /assets 檔名帶內容雜湊（index-BbbKxweN.js），
 * 內容改變檔名就改變，本來就適合長期快取。
 *
 * 反過來，index.html 必須永遠重新驗證——
 * 它指向帶雜湊的資源，被快取會讓使用者拿到舊 bundle 指向已不存在的檔名。
 *
 * 這也正是上一輪踩到的問題：瀏覽器載入舊 bundle，
 * 讓已修正的問題看起來仍然存在。
 */
const SERVER_TS = path.resolve(__dirname, '..', '..', 'server.ts');
const src = readFileSync(SERVER_TS, 'utf8');

describe('正式環境靜態資源的快取策略', () => {
  it('/assets 必須使用長期不可變快取', () => {
    expect(src, '未為 /assets 設定 immutable 快取').toMatch(/immutable:\s*true/);
    expect(src, '未為 /assets 設定長期快取').toMatch(/maxAge:\s*["']365d["']/);
  });

  it('/assets 必須獨立於一般靜態檔案之外註冊', () => {
    // 若只有一個 express.static，兩者會共用同一組設定
    const 靜態註冊 = [...src.matchAll(/express\.static\(/g)].length;
    expect(靜態註冊, '/assets 與其他靜態檔案必須分開註冊，才能套用不同快取策略')
      .toBeGreaterThanOrEqual(2);
  });

  it('index.html 必須明確禁止快取', () => {
    // 被快取的 index.html 會指向舊的雜湊檔名
    expect(src, 'index.html 未設定 no-cache').toMatch(/Cache-Control["'],\s*["']no-cache["']/);
  });

  it('開發模式的 Vite 中介層不得受影響', () => {
    expect(src, '開發模式仍應使用 Vite 中介層').toMatch(/NODE_ENV\s*!==\s*["']production["']/);
    expect(src).toMatch(/createViteServer/);
  });

  it('不得對整個 dist 使用長期快取', () => {
    // 非 assets 的檔案（若日後加入 manifest、robots.txt 等）不該長期快取
    const 一般靜態 = src.match(/express\.static\(distPath,\s*\{([^}]*)\}\)/);
    expect(一般靜態, '一般靜態檔案應明確設定 maxAge: 0').not.toBeNull();
    expect(一般靜態?.[1]).toMatch(/maxAge:\s*0/);
    expect(一般靜態?.[1]).not.toMatch(/immutable/);
  });
});
