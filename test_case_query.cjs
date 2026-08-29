const assert = require('node:assert/strict');

(async () => {
  const { normalizeTaiwanCaseQuery } = await import('./src/lib/caseQuery.ts');

  assert.equal(normalizeTaiwanCaseQuery('112 年度台上字第 2409 號'), '112 台上 2409');
  assert.equal(normalizeTaiwanCaseQuery('台上字第2409號'), '台上字第2409號');
  assert.equal(normalizeTaiwanCaseQuery('（2024）粵03民初123號'), '（2024）粵03民初123號');

  assert.equal(
    normalizeTaiwanCaseQuery('https://judgment.judicial.gov.tw/FJUD/data.aspx?id=ID-1&jrecno=J-2&kw=K-3'),
    'ID-1'
  );
  assert.equal(
    normalizeTaiwanCaseQuery('https://judgment.judicial.gov.tw/FJUD/data.aspx?jrecno=J-2&kw=K-3'),
    'J-2'
  );
  assert.equal(
    normalizeTaiwanCaseQuery('https://judgment.judicial.gov.tw/FJUD/data.aspx?kw=K-3'),
    'K-3'
  );

  console.log('Case query tests passed');
})();
