import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 後端程式碼不得透過靜態檔案服務外流。
 *
 * 實測發現（正式站）：
 *   /server.cjs     → 200，1,030,770 bytes，伺服器端程式碼
 *   /server.cjs.map → 200，1,757,449 bytes，完整 TypeScript 原始碼
 *   source map 直接列出每個後端來源檔名。
 *
 * 成因：伺服器 bundle 建置到 dist/，而伺服器以
 * express.static(distPath) 公開整個 dist 目錄。
 *
 * 本次的修法是移除根因——bundle 改建置到 build/，
 * dist/ 只剩前端資源。守衛式的寫法（靠規則擋檔名）容易在
 * 未來新增產物時失效，檔案不在該目錄就不需要守衛。
 */

const 專案根 = process.cwd();
const serverTs = readFileSync(join(專案根, 'server.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(專案根, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('後端程式碼不得外流', () => {
  it('伺服器 bundle 必須建置在 dist 之外', () => {
    // 落在 dist/ 就會被 express.static(distPath) 一起送出去。
    expect(packageJson.scripts.build).not.toContain('outfile=dist/');
    expect(packageJson.scripts.start).toContain('build/server.cjs');
  });

  it('正式建置不產出 source map', () => {
    // 沒有任何流程消費 map：無錯誤回報服務、無部署檢查、無除錯腳本。
    // 留在正式環境只是把原始碼公開出去。
    expect(packageJson.scripts.build).not.toContain('--sourcemap');
  });

  it('dist 目錄不得含後端程式碼或原始碼對應檔', () => {
    const distPath = join(專案根, 'dist');
    if (!existsSync(join(distPath, 'index.html'))) return; // 尚未建置
    expect(existsSync(join(distPath, 'server.cjs')), 'dist/server.cjs 不應存在').toBe(false);
    expect(existsSync(join(distPath, 'server.cjs.map')), 'dist/server.cjs.map 不應存在').toBe(false);
  });

  it('build 目錄必須被 git 忽略', () => {
    expect(readFileSync(join(專案根, '.gitignore'), 'utf8')).toMatch(/^build\/$/m);
  });

  it('仍提供前端需要的資源', () => {
    // 收緊範圍後不可連帶影響正常功能。
    expect(serverTs).toContain('express.static(path.join(distPath, "assets")');
    expect(serverTs).toMatch(/express\.static\(distPath,\s*\{\s*maxAge:\s*0\s*\}\)/);
    expect(serverTs).toContain('path.join(distPath, "index.html")');
  });
});
