import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * 禁止在瀏覽器端程式碼中使用裸 fetch() 呼叫自家 API。
 *
 * 背景：正式環境 REQUIRE_AUTH 為 true，訪客權杖只存於 sessionStorage，
 * 且僅由 apiClient 的 fetchWithAuth 附加到 Authorization 標頭。
 * 使用裸 fetch 呼叫 /api/* 會直接得到 401，功能表面可點、實際永遠失敗，
 * 使用者只會看到「查詢失敗」這類無方向性的訊息。
 *
 * 本專案已因此實際損失多個功能（外部裁判字號覆核、司法院開放資料工具、
 * 書狀產製、引用掃描、導診分析），故以測試形式釘死。
 */

const CLIENT_ROOTS = ['src/components', 'src/hooks', 'src/features', 'src/contexts', 'src/lib'];
const ALLOWED_FILES = new Set([
  // apiClient 本身就是驗證封裝的實作處
  'src/lib/apiClient.ts',
  // 伺服器端 provider 與純離線工具不使用瀏覽器 sessionStorage
  'src/ai/providers/OpenAICompatibleProvider.ts',
  'src/ai/providers/GeminiProvider.ts',
  'src/ai/providers/AgnesProvider.ts',
  'src/lib/taiwanLegalDbClient.ts'
]);

function collectFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
    out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

describe('瀏覽器端 API 請求必須帶驗證', () => {
  const offenders: string[] = [];

  for (const root of CLIENT_ROOTS) {
    for (const file of collectFiles(root)) {
      if (ALLOWED_FILES.has(file)) continue;
      const source = readFileSync(file, 'utf-8');
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      // 抓出未經 fetchWithAuth／fetchWithHandler 包裝的相對路徑 API 呼叫
      if (/(?<![A-Za-z.])fetch\(\s*['"`]\/api\//.test(code)) {
        offenders.push(file);
      }
    }
  }

  it('不得存在未帶驗證的 /api/ 請求', () => {
    expect(
      offenders,
      `以下檔案使用裸 fetch 呼叫 /api/*，正式環境會 401：\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('apiClient 必須提供會自動補 token 的 fetchWithAuth', () => {
    const apiClient = readFileSync('src/lib/apiClient.ts', 'utf-8');
    expect(apiClient).toMatch(/export\s+async\s+function\s+fetchWithAuth/);
    expect(apiClient).toMatch(/Authorization/);
  });
});
