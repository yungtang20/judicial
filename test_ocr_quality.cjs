const assert = require('node:assert/strict');
const { PNG } = require('pngjs');

async function run() {
  const { assessOcrText, validateImagePixels } = await import('./src/lib/ocrQuality.ts');
  const { validateImageDataUrl } = await import('./src/lib/ocrImageValidation.ts');
  assert.equal(assessOcrText('姓名[不確定][不確定]身分證號[不確定]，地址[不確定]').needsManualReview, true);
  assert.equal(assessOcrText('姓名王小明，住址臺北市').needsManualReview, false);
  assert.deepEqual(validateImagePixels(new Uint8Array([0, 0, 0, 0])), { ok: false, error: 'IMAGE_BLANK_OR_SOLID' });
  assert.deepEqual(validateImagePixels(new Uint8Array([255, 255, 255, 255])), { ok: false, error: 'IMAGE_BLANK_OR_SOLID' });
  assert.deepEqual(validateImagePixels({ min: 10, max: 250 }), { ok: true });
  const png = new PNG({ width: 2, height: 1 });
  png.data.set([10, 10, 10, 255, 250, 250, 250, 255]);
  assert.deepEqual(await validateImageDataUrl(`data:image/png;base64,${PNG.sync.write(png).toString('base64')}`), { ok: true });
  assert.equal(assessOcrText('身分證號 A1[不確定]789').untrustedFields.includes('身分證號'), true);
}

run().then(() => console.log('OCR quality tests passed'));
