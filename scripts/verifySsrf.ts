import assert from 'node:assert/strict';
import { isBasicSafeUrl, isPrivateIp } from '../server/routes/fetchUrl.ts';

const dangerousUrls = [
  'http://localhost:3000/api/secret',
  'http://127.0.0.1:8080/admin',
  'http://0.0.0.0/',
  'http://[::1]/',
  'http://[::]/',
  'http://[fe80::1]/',
  'http://[fc00::1]/',
  'http://server.local/internal',
  'http://k8s.internal/',
  'http://10.0.0.1/metadata',
  'http://192.168.1.1/router',
  'http://172.16.0.5/',
  'http://172.31.255.255/',
  'http://169.254.169.254/latest/meta-data/',
  'http://100.64.0.1/',
  'http://2130706433/',
  'http://0x7f000001/',
  'ftp://example.com/file',
  'file:///etc/passwd',
  'javascript:alert(1)',
  'gopher://evil.com'
];

const safeUrls = [
  'https://law.moj.gov.tw/LawClass/LawAll.aspx',
  'https://juds.judicial.gov.tw/juds/index1.htm',
  'http://example.com/judgment.html',
  'https://www.judicial.gov.tw'
];

console.log('[SSRF Test] 開始執行正式 production SSRF 驗證...');
for (const url of dangerousUrls) {
  assert.equal(isBasicSafeUrl(url).safe, false, `危險網址未被正式防護阻擋：${url}`);
}
for (const url of safeUrls) {
  assert.equal(isBasicSafeUrl(url).safe, true, `合法網址被正式防護誤判：${url}`);
}
assert.equal(isPrivateIp('8.8.8.8'), false);
assert.equal(isPrivateIp('127.0.0.1'), true);
assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
console.log(`[SSRF Test] 驗證成功！共檢核 ${dangerousUrls.length} 個高風險網址與 ${safeUrls.length} 個合法網址，直接使用 production exports。`);
