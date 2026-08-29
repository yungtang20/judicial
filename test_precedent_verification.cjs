const assert = require('node:assert/strict');

async function loadModule() {
  return import('./src/lib/precedentVerification.ts');
}

async function testVerifiedCitationsAreRetainedAndUnknownOnesRemoved() {
  const { verifyPrecedents } = await loadModule();
  const calls = [];
  const results = await verifyPrecedents([
    { citation: '最高法院 112 年度台上字第 1234 號', summary: 'verified' },
    { citation: '最高法院 999 年度不存在字第 1 號', summary: 'fake' }
  ], async (query) => {
    calls.push(query);
    return query.includes('112 年度')
      ? { results: [{ citation_text: query, doc_id: 'real-1', result_token: 'token-1' }] }
      : { results: [] };
  });

  assert.deepEqual(calls, [
    '最高法院 112 年度台上字第 1234 號',
    '最高法院 999 年度不存在字第 1 號'
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].citation, '最高法院 112 年度台上字第 1234 號');
}

async function testVerificationFailureReturnsFailClosedFallback() {
  const { buildPrecedentFallback } = await loadModule();
  assert.deepEqual(buildPrecedentFallback(new Error('TLR unavailable')), {
    precedents: [],
    isFallback: true,
    warning: 'AI 搜尋暫時無法取得可信判例，請自行查證'
  });
}

Promise.all([
  testVerifiedCitationsAreRetainedAndUnknownOnesRemoved(),
  testVerificationFailureReturnsFailClosedFallback()
]).then(() => console.log('precedent verification tests passed'));
