import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { copyToClipboard } from '../lib/citationFormatter';

/**
 * 複製功能必須依實際結果回報。
 *
 * 實測：三處複製處理器直接呼叫 navigator.clipboard.writeText 且未接錯誤處理。
 * 寫入失敗時（例如權限被拒或非安全上下文）畫面仍顯示「已複製」，
 * 但其實一個字都沒複製——使用者會以為已備份而直接離開。
 */
const SRC = path.resolve(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (entry.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('複製功能的成功訊號必須可信', () => {
  const files = collect(path.join(SRC, 'components')).filter(f => !f.includes('.test.'));

  it('不得直接呼叫 navigator.clipboard.writeText', () => {
    // 排除註解行：說明文字提到這個 API 不算實際呼叫
    const offenders = files.filter(f =>
      readFileSync(f, 'utf8').split('\n').some(line => {
        const t = line.trim();
        return !t.startsWith('//') && !t.startsWith('*') && t.includes('navigator.clipboard.writeText');
      })
    );
    expect(
      offenders.map(f => path.relative(SRC, f)),
      '請改用 lib/citationFormatter 的 copyToClipboard，它具備備援機制並回傳實際結果'
    ).toEqual([]);
  });

  it('copyToClipboard 的備援鏈必須能在 Clipboard API 不可用時運作', async () => {
    const originalClipboard = navigator.clipboard;
    // 模擬 Clipboard API 完全不可用（常見於非安全上下文）
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    try {
      const originalExec = document.execCommand;
      document.execCommand = () => true;
      const ok = await copyToClipboard('測試內容');
      document.execCommand = originalExec;
      expect(ok).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    }
  });

  it('兩種路徑都失敗時必須回傳 false，不得假裝成功', async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    try {
      const originalExec = document.execCommand;
      document.execCommand = () => false;
      const ok = await copyToClipboard('測試內容');
      document.execCommand = originalExec;
      expect(ok).toBe(false);
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    }
  });
});
