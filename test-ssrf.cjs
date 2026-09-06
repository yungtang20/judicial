/**
 * SSRF 防護單元測試腳本 (test-ssrf.cjs)
 * 驗證 SSRF 攔截規則（包含 IPv4/IPv6、保留網段、CGNAT、數字 IP 等）
 */

const assert = require('assert');
const net = require('net');

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [b0, b1] = parts;
  if (b0 === 0) return true;
  if (b0 === 10) return true;
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  if (b0 === 127) return true;
  if (b0 === 169 && b1 === 254) return true;
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  if (b0 === 192 && b1 === 0) return true;
  if (b0 === 192 && b1 === 88) return true;
  if (b0 === 192 && b1 === 168) return true;
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  if (b0 === 198 && b1 === 51) return true;
  if (b0 === 203 && b1 === 0) return true;
  if (b0 >= 224) return true;
  return false;
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  if (
    normalized === '::1' ||
    normalized === '::' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    normalized === '0:0:0:0:0:0:0:0'
  ) {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) return true;
  return false;
}

function isPrivateIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

function isSafeUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    const cleanHost = hostname.replace(/^\[|\]$/g, '');

    if (
      cleanHost === 'localhost' ||
      cleanHost === '0.0.0.0' ||
      cleanHost === '127.0.0.1' ||
      cleanHost === '::1' ||
      cleanHost.endsWith('.local') ||
      cleanHost.endsWith('.internal') ||
      cleanHost.endsWith('.arpa') ||
      cleanHost.endsWith('.lan')
    ) {
      return false;
    }

    if (/^\d+$/.test(cleanHost) || /^0x[0-9a-f]+$/i.test(cleanHost)) {
      return false;
    }

    if (net.isIP(cleanHost)) {
      return !isPrivateIp(cleanHost);
    }

    return true;
  } catch {
    return false;
  }
}

console.log('[SSRF Test] 開始執行 SSRF 嚴格安全防禦驗證...');

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
  'http://100.64.0.1/', // CGNAT
  'http://2130706433/', // Decimal IP representation of 127.0.0.1
  'http://0x7f000001/', // Hex IP representation of 127.0.0.1
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
  'http://example.com/judgment.html',
  'https://www.judicial.gov.tw'
];

for (const url of safeUrls) {
  const safe = isSafeUrl(url);
  assert.strictEqual(safe, true, `合法網址不應被阻擋 -> ${url}`);
}

console.log(`[SSRF Test] 驗證成功！共檢核 ${dangerousUrls.length} 個高風險網址與 ${safeUrls.length} 個合法網址，防禦全部生效。`);
