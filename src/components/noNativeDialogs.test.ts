import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * 不得使用原生 alert／confirm／prompt。
 *
 * 原生對話框會凍結整個頁面、無法樣式化、無法翻譯，
 * 在部分嵌入環境會被直接封鎖，且螢幕閱讀器的處理不一致。
 * 專案已有 useGlobalUI 的 showToast。
 *
 * 實測：統一入口的「儲存目前內容」會開原生 prompt() 詢問案例名稱，
 * 凍結整個頁面；且與應用既有的自訂案例編輯彈窗重複。
 */
const COMPONENTS = path.resolve(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '__tests__'].includes(entry) || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (/\.tsx$/.test(entry) && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

describe('前端不得使用原生對話框', () => {
  const offenders: string[] = [];

  for (const file of collect(COMPONENTS)) {
    const src = readFileSync(file, 'utf8');
    const code = src
      // CRLF 檔案中 `.` 在 JavaScript 不匹配 `\r`，
      // 因此不以 $ 錨定行尾會剝除不掉行尾註解，先把換行正規化。
      .replace(/\r\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
    for (const m of code.matchAll(/(^|[^a-zA-Z.$])(alert|confirm|prompt)\s*\(/g)) {
      const line = code.slice(0, m.index).split('\n').length;
      offenders.push(`${path.relative(COMPONENTS, file)}:${line}  ${m[2]}()`);
    }
  }

  it('alert／confirm／prompt 應改用 useGlobalUI 的 showToast', () => {
    expect(
      offenders,
      `原生對話框會凍結頁面且無法翻譯：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
