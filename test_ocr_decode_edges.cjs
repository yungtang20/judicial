const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { validateImageDataUrl, validateImageDataUrls } = await import('./src/lib/ocrImageValidation.ts');
  assert.deepEqual(await validateImageDataUrl('data:image/png;base64,not-a-png'), { ok: false, error: 'IMAGE_INVALID_DATA' });
  assert.deepEqual(await validateImageDataUrl('data:image/webp;base64,AAAA'), { ok: false, error: 'IMAGE_UNSUPPORTED_FORMAT' });
  assert.deepEqual(await validateImageDataUrl(`data:image/png;base64,${Buffer.alloc(50 * 1024 * 1024).toString('base64')}`), { ok: false, error: 'IMAGE_DECODE_TIMEOUT' });

  const checks = await validateImageDataUrls([
    'data:image/png;base64,not-a-png',
    'data:image/png;base64,also-not-a-png'
  ]);
  assert.deepEqual(checks.map((check) => check.error), ['IMAGE_INVALID_DATA', 'IMAGE_INVALID_DATA']);

  const server = fs.readFileSync('server.ts', 'utf8');
  const ocrRoute = server.slice(server.indexOf('app.post("/api/ocr"'), server.indexOf('app.post("/api/analyze-judgment"'));
  assert.equal((ocrRoute.match(/validateImageDataUrl\(/g) || []).length, 1);
  assert.ok(ocrRoute.indexOf('validateImageDataUrl(') < ocrRoute.indexOf('ocrMaxRetries'));
  assert.match(ocrRoute, /for \(const image of images\)/);
  assert.doesNotMatch(ocrRoute, /Promise\.all\(images\.map/);
  console.log('OCR decode edge tests passed');
})();
