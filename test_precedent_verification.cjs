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

async function testOneTlrFailureDoesNotDiscardOtherCitations() {
  const { verifyPrecedents } = await loadModule();
  const results = await verifyPrecedents([
    { citation: '112 年度台上字第 1 號' },
    { citation: '112 年度台上字第 2 號' }
  ], async (query) => {
    if (query.endsWith('第 1 號')) throw Object.assign(new Error('timeout'), { code: 'TLR_TIMEOUT' });
    return { results: [{ citation_text: query }] };
  });
  assert.deepEqual(results, [{ citation: '112 年度台上字第 2 號' }]);
}

async function testCitationNormalizationAndStrictCourtMatching() {
  const { verifyPrecedents, normalizeCitation } = await loadModule();
  assert.equal(normalizeCitation('最高法院　112 年度台上字第 1234 號'), '最高法院112年度台上字第1234號');
  const results = await verifyPrecedents([
    { citation: '最高法院 112 年度台上字第 1234 號' },
    { citation: '最高法院 112 年度台上字第 5678 號' }
  ], async (query) => ({ results: [{ citation_text: query.endsWith('5678 號') ? '臺灣高等法院 112 年度台上字第 5678 號' : '最高法院112年度台上字第1234號（民事）' }] }));
  assert.deepEqual(results, [{ citation: '最高法院 112 年度台上字第 1234 號' }]);
  assert.deepEqual(await verifyPrecedents(null, async () => ({ results: [] })), []);
}

async function testManyCitationsRemainOrderedWhenResolvedOutOfOrder() {
  const { verifyPrecedents } = await loadModule();
  const citations = Array.from({ length: 12 }, (_, index) => ({ citation: `112 年度台上字第 ${index + 1} 號` }));
  const results = await verifyPrecedents(citations, async (query) => {
    const number = Number(query.match(/第 (\d+) 號/)?.[1]);
    await new Promise((resolve) => setTimeout(resolve, (12 - number) * 2));
    return { results: [{ citation_text: query }] };
  });
  assert.deepEqual(results, citations);
}

Promise.all([
  testVerifiedCitationsAreRetainedAndUnknownOnesRemoved(),
  testVerificationFailureReturnsFailClosedFallback(),
  testOneTlrFailureDoesNotDiscardOtherCitations(),
  testCitationNormalizationAndStrictCourtMatching(),
  testManyCitationsRemainOrderedWhenResolvedOutOfOrder()
]).then(() => console.log('precedent verification tests passed'));
