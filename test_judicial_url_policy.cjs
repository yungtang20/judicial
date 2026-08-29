const assert = require('node:assert/strict');
const fs = require('node:fs');

const PUBLIC_LOOKUP = async () => [{ address: '1.1.1.1', family: 4 }];

function response(status, location) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => name.toLowerCase() === 'location' ? location ?? null : null }
  };
}

async function run() {
  const { validateJudicialUrl, fetchJudicialUrl } = await import('./src/lib/judicialUrlPolicy.ts');

  for (const input of [
    'https://judicial.gov.tw/',
    'https://www.judicial.gov.tw/tw/mp-1.html',
    'https://judgment.judicial.gov.tw/FJUD/default.aspx'
  ]) {
    const parsed = await validateJudicialUrl(input, { lookup: PUBLIC_LOOKUP });
    assert.equal(parsed.protocol, 'https:');
  }

  for (const input of [
    'http://judicial.gov.tw/',
    'file:///etc/passwd',
    'ftp://judicial.gov.tw/file',
    'https://localhost/',
    'https://127.0.0.1/',
    'https://[::1]/',
    'https://169.254.169.254/latest/meta-data/',
    'https://judicial.gov.tw.evil.example/',
    'https://eviljudicial.gov.tw/',
    'https://judicial.gov.tw@evil.example/'
  ]) {
    await assert.rejects(
      () => validateJudicialUrl(input, { lookup: PUBLIC_LOOKUP }),
      (error) => typeof error?.code === 'string' && error.code.startsWith('JUDICIAL_URL_'),
      input
    );
  }

  for (const address of ['10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '127.0.0.1', '::1', 'fc00::1', 'fe80::1']) {
    await assert.rejects(
      () => validateJudicialUrl('https://judgment.judicial.gov.tw/', {
        lookup: async () => [{ address, family: address.includes(':') ? 6 : 4 }]
      }),
      (error) => error?.code === 'JUDICIAL_URL_PRIVATE_ADDRESS',
      address
    );
  }

  const blockedCalls = [];
  await assert.rejects(
    () => fetchJudicialUrl(async (url, options) => {
      blockedCalls.push({ url, options });
      return response(302, 'http://127.0.0.1/internal');
    }, 'https://judicial.gov.tw/start', { lookup: PUBLIC_LOOKUP }),
    (error) => typeof error?.code === 'string' && error.code.startsWith('JUDICIAL_URL_')
  );
  assert.equal(blockedCalls.length, 1, 'unsafe redirect must not be requested');
  assert.equal(blockedCalls[0].options.redirect, 'manual');

  const allowedCalls = [];
  const finalResponse = await fetchJudicialUrl(async (url, options) => {
    allowedCalls.push({ url, options });
    return allowedCalls.length === 1
      ? response(302, 'https://judgment.judicial.gov.tw/FJUD/default.aspx')
      : response(200);
  }, 'https://www.judicial.gov.tw/start', { lookup: PUBLIC_LOOKUP });
  assert.equal(finalResponse.status, 200);
  assert.equal(allowedCalls.length, 2);
  assert.ok(allowedCalls.every((call) => call.options.redirect === 'manual'));

  const server = fs.readFileSync('./server.ts', 'utf8');
  const route = server.slice(server.indexOf('app.post("/api/fetch-url"'), server.indexOf('app.post("/api/analyze-judgment"'));
  assert.match(server, /from ["']\.\/src\/lib\/judicialUrlPolicy\.js["']/);
  assert.match(route, /await fetchJudicialUrl\(fetch,\s*url/);
  assert.doesNotMatch(route, /await fetch\(url,/);
}

run().then(() => console.log('Judicial URL policy tests passed'));
