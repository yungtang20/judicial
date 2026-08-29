const assert = require('node:assert/strict');

async function run() {
  const { assessOcrText, validateImagePixels } = await import('./src/lib/ocrQuality.ts');
  assert.equal(assessOcrText('姓名[不確定][不確定]身分證號[不確定]，地址[不確定]').needsManualReview, true);
  assert.equal(assessOcrText('姓名王小明，住址臺北市').needsManualReview, false);
  assert.deepEqual(validateImagePixels(new Uint8Array([0, 0, 0, 0])), { ok: false, error: 'IMAGE_BLANK_OR_SOLID' });
  assert.deepEqual(validateImagePixels(new Uint8Array([255, 255, 255, 255])), { ok: false, error: 'IMAGE_BLANK_OR_SOLID' });
  assert.equal(assessOcrText('身分證號 A1[不確定]789').untrustedFields.includes('身分證號'), true);
}

run().then(() => console.log('OCR quality tests passed'));
