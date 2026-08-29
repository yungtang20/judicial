const assert = require('node:assert/strict');
const fs = require('node:fs');

async function run() {
  const { searchTlr } = await import('./src/lib/tlrSearch.ts');
  const fixture = JSON.parse(fs.readFileSync('./fixtures/tlr-search/76-taishang-4986.json', 'utf8'));
  let request;
  const result = await searchTlr(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => fixture };
  }, '最高法院 76 年台上字第 4986 號');
  assert.equal(request.url, 'https://tlr.dr-legal.com.tw/v1/search');
  assert.equal(JSON.parse(request.options.body).query, '最高法院 76 年台上字第 4986 號');
  assert.deepEqual(result, fixture);

  await assert.rejects(
    () => searchTlr(() => new Promise(() => {}), '112 年度台上字第 1 號', { timeoutMs: 20 }),
    (error) => error.code === 'TLR_TIMEOUT'
  );

  await assert.rejects(
    () => searchTlr(async () => ({ ok: false, status: 503, json: async () => ({}) }), '112 年度台上字第 1 號'),
    (error) => error.code === 'TLR_UPSTREAM_ERROR'
  );

  await assert.rejects(
    () => searchTlr(async () => ({ ok: true, json: async () => ({ unexpected: true }) }), '112 年度台上字第 1 號'),
    (error) => error.code === 'TLR_INVALID_RESPONSE'
  );
}

run().then(() => console.log('TLR search tests passed'));
