import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * 防止 PDF 解析在正式環境再次失效。
 *
 * 背景：正式環境 CSP 為 `worker-src 'self' blob:`、`connect-src` 亦不含第三方網域。
 * pdf.js 的 worker 若指向 https://cdn.jsdelivr.net，會被 CSP 擋下，
 * 所有 PDF 上傳都會失敗，而錯誤訊息卻誤導使用者以為是掃描版問題。
 */
describe('pdf.js worker 必須自架', () => {
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'pdfUtils.ts'),
    'utf-8'
  );

  // 註解會記錄歷史沿革，比對前必須先移除，否則會被說明文字誤判。
  const codeOnly = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('不得再把 worker 指向第三方 CDN', () => {
    expect(codeOnly).not.toMatch(/cdn\.jsdelivr\.net/);
    expect(codeOnly).not.toMatch(/unpkg\.com/);
    expect(codeOnly).not.toMatch(/https?:\/\/[^'"\s]*pdf\.worker/);
  });

  it('必須使用 Vite 打包的同源 worker 網址', () => {
    expect(source).toMatch(/from\s+'pdfjs-dist\/build\/pdf\.worker\.mjs\?url'/);
    expect(source).toMatch(/workerSrc\s*=\s*pdfWorkerUrl/);
  });

  it('CSP 不得為第三方 PDF worker 放行', () => {
    const security = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../server/middleware/security.ts'),
      'utf-8'
    );
    const workerSrc = security.match(/workerSrc:\s*\[([^\]]*)\]/);
    expect(workerSrc).not.toBeNull();
    // worker 只允許同源與 blob，放行外部 CDN 等於把法律文件的使用行為送到第三方
    expect(workerSrc?.[1]).not.toMatch(/https?:/);
  });
});
