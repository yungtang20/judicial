const assert = require('node:assert/strict');

async function run() {
  const { buildFallbackJudgmentAnalysis } = await import('./src/utils/fallbacks.ts');
  const result = buildFallbackJudgmentAnalysis('內容不足，無法確認案件');
  assert.equal(result.isFallback, true);
  assert.equal(result.caseNo, '');
  assert.equal(result.judgeDate, '');
  assert.equal(result.appealEligibility, 'UNKNOWN');
  assert.equal(result.judgmentSummary, null);
  assert.deepEqual(result.suggestedIssues, []);
  assert.deepEqual(result.suggestedEvidences, []);
}

run().then(() => console.log('fail-closed fallback tests passed'));
