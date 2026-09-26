import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 司法院開放資料平台的「前端完整、後端缺席」防護。
 *
 * 背景：JudicialOpenDataTool 會呼叫 8 個 /api/judicial/* 端點
 * （env-status、categories、categories/:catNo/resources、fileset/:id、
 *   member-token、jdg/auth、jdg/jlist、jdg/jdoc），
 * 但 server/routes/judicial.ts 只實作了 /api/search-precedents。
 * 舊流程把這個 404 顯示為「未檢測到環境變數，可於下方手動輸入帳密」，
 * 使用者會白填一組永遠不會被送出的憑證。
 */
describe('司法院開放資料後端可用性', () => {
  const tool = readFileSync(path.join(root, 'src/components/JudicialOpenDataTool.tsx'), 'utf-8');
  const route = readFileSync(path.join(root, 'server/routes/judicial.ts'), 'utf-8');

  it('後端確實尚未提供這些端點（測試守護的前提）', () => {
    for (const endpoint of ['env-status', 'categories', 'member-token', 'jdg/auth', 'jdg/jlist', 'jdg/jdoc']) {
      expect(route).not.toContain(`/api/judicial/${endpoint}`);
    }
  });

  it('必須區分「後端不存在」與「未設定憑證」', () => {
    expect(tool).toMatch(/backendAvailable/);
    expect(tool).toMatch(/setBackendAvailable\(false\)/);
    // 後端不可用時不得再顯示「只差設定憑證」
    expect(tool).toMatch(/backendAvailable === false/);
  });

  it('後端不可用時必須停用帳密輸入欄位', () => {
    expect(tool).toMatch(/<fieldset[\s\S]{0,200}disabled=\{backendAvailable === false\}/);
  });

  it('必須指引使用者改用可用的替代路徑', () => {
    expect(tool).toMatch(/匯入裁判書全文檢索|上傳 PDF|貼上文字/);
  });

  it('本測試引用的檔案必須存在', () => {
    expect(existsSync(path.join(root, 'server/routes/judicial.ts'))).toBe(true);
    expect(existsSync(path.join(root, 'src/components/JudicialOpenDataTool.tsx'))).toBe(true);
  });
});
