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
}

run().then(() => console.log('TLR search tests passed'));
