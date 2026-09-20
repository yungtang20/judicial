/**
 * 可重現來源頁匯入腳本：抓司法院來源頁 → 顯式解碼 → 產出 manifest 預覽
 *
 * 設計原則：
 * - 顯式解碼：依 HTTP Content-Type charset 或頁面 <meta> 決定解碼器（utf-8 / big5），
 *   這是歷次 manifest 亂碼根因——混合編碼頁面未顯式解碼。
 * - 寫入 JSON 前強制檢查 U+FFFD，發現即 fail-fast，不讓壞資料進版控。
 * - 只讀來源頁，產出寫獨立輸出檔，人工比對後再合併進 manifest。
 *
 * 用法：
 *   node scripts/ingest-official-template-sources.mjs --url "https://www.judicial.gov.tw/tw/cp-xxx-yyy.html" [--out path]
 */

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ALLOWED_HOSTS = new Set(['www.judicial.gov.tw']);

async function fetchAndDecode(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !DEFAULT_ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Blocked source URL: ${url}`);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'user-agent': 'Smart-Legal-Assistant/1.0 template-ingest' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

  const buffer = Buffer.from(await response.arrayBuffer());

  // 依序決定解碼器：HTTP 標頭 charset → 頁面 <meta> charset → fallback utf-8（警告）
  const headerCharset = (response.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1]?.toLowerCase();
  const metaCharset = buffer.subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const charset = headerCharset || metaCharset;

  let html;
  if (charset === 'big5') {
    html = new TextDecoder('big5').decode(buffer);
  } else {
    if (!charset) console.warn(`[ingest] ${url} 未見 charset 宣告，fallback utf-8`);
    html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  }
  return { html, charset: charset || 'utf-8(fallback)', url };
}

function assertNoReplacementChars(label, text) {
  const count = text.split('\uFFFD').length - 1;
  if (count > 0) throw new Error(`${label} 含 ${count} 個 U+FFFD，解碼失敗，拒絕寫入`);
}

export async function ingestSourcePages(urls, { outPath } = {}) {
  const entries = [];
  for (const url of urls) {
    const { html, charset, url: finalUrl } = await fetchAndDecode(url);
    assertNoReplacementChars(`來源頁 ${finalUrl}（charset=${charset}）`, html);
    // 抽出來源頁標題與表單欄位名（司法院來源頁結構固定，regex 足夠；不引外部 parser）
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
    const fields = [...html.matchAll(/<input[^>]*\sname=["']([^"']+)["']/gi)].map((m) => m[1]);
    entries.push({ sourceUrl: finalUrl, charset, title, fields, ingestedAt: new Date().toISOString() });
    console.log(`[ingest] ${finalUrl}（${charset}）→ ${fields.length} 欄位`);
  }

  const outputText = JSON.stringify(entries, null, 2);
  assertNoReplacementChars('輸出 JSON', outputText);
  const out = outPath || path.resolve('data/official-templates/ingest-preview.json');
  await writeFile(out, outputText + '\n', 'utf8');
  console.log(`[ingest] 寫入 ${out}，共 ${entries.length} 筆`);
  return entries;
}

// CLI 入口（直接執行時才走 main；被 import 時只 export）
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2);
  const getArg = (flag) => args[args.indexOf(flag) + 1];
  const urls = getArg('--url')
    ? [getArg('--url')]
    : getArg('--urls-file')
      ? (await readFile(getArg('--urls-file'), 'utf8')).split('\n').filter(Boolean)
      : [];
  if (urls.length === 0) {
    console.error('請提供 --url <來源頁 URL> 或 --urls-file <每行一個 URL>');
    process.exit(1);
  }
  await ingestSourcePages(urls, { outPath: getArg('--out') });
}
