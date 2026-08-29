const assert = require('node:assert/strict');

(async () => {
  const { markLowConfidenceRegions } = await import('./src/lib/paddleConfidence.ts');
  const result = markLowConfidenceRegions([
    { text: '案號：112年度台上字第1號', transcriptionConfidence: 0.98 },
    { text: '姓名王小明', transcriptionConfidence: 0.42 },
    { text: '住址臺北市', transcriptionConfidence: 0.91 }
  ], 0.8);
  assert.equal(result.text, '案號：112年度台上字第1號[不確定]姓名王小明住址臺北市');
  assert.deepEqual(result.lowConfidenceRegions, [{ text: '姓名王小明', transcriptionConfidence: 0.42 }]);
  assert.equal(result.needsManualReview, true);
  assert.deepEqual(markLowConfidenceRegions([{ text: '清楚文字', transcriptionConfidence: 0.9 }]), {
    text: '清楚文字', lowConfidenceRegions: [], needsManualReview: false
  });
  assert.deepEqual(markLowConfidenceRegions([{ text: '版面框', layoutScore: 0.42 }]), {
    text: '版面框', lowConfidenceRegions: [], needsManualReview: false
  });
  console.log('Paddle confidence tests passed');
})();
