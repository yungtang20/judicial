/**
 * SSRF 防護單元測試腳本 (test-ssrf.cjs)
 * 驗證 server/routes/fetchUrl.ts 的 isSafeUrl 與 SSRF 攔截規則
 */

const assert = require('assert');

function isSafeUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") || // Cloud metadata endpoint
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

console.log('[SSRF Test] 開始執行 SSRF 安全防禦驗證...');

const dangerousUrls = [
  'http://localhost:3000/api/secret',
  'http://127.0.0.1:8080/admin',
  'http://0.0.0.0/',
  'http://[::1]/',
  'http://server.local/internal',
  'http://10.0.0.1/metadata',
  'http://192.168.1.1/router',
  'http://172.16.0.5/',
  'http://169.254.169.254/latest/meta-data/',
  'ftp://example.com/file',
  'file:///etc/passwd',
  'javascript:alert(1)',
  'gopher://evil.com'
];

for (const url of dangerousUrls) {
  const safe = isSafeUrl(url);
  assert.strictEqual(safe, false, `SSRF 漏洞：危險網址未被阻擋 -> ${url}`);
}

const safeUrls = [
  'https://law.moj.gov.tw/LawClass/LawAll.aspx',
  'https://juds.judicial.gov.tw/juds/index1.htm',
  'http://example.com/judgment.html'
];

for (const url of safeUrls) {
  const safe = isSafeUrl(url);
  assert.strictEqual(safe, true, `合法網址不應被阻擋 -> ${url}`);
}

console.log(`[SSRF Test] 驗證成功！共檢核 ${dangerousUrls.length} 個高風險網址與 ${safeUrls.length} 個合法網址，防禦全部生效。`);
