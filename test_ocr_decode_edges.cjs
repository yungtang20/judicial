const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

(async () => {
  const { validateImageDataUrl, validateImageDataUrls } = await import('./src/lib/ocrImageValidation.ts');
  const png = new PNG({ width: 2, height: 2 });
  png.data.set([10, 10, 10, 255, 80, 80, 80, 255, 160, 160, 160, 255, 250, 250, 250, 255]);
  assert.deepEqual(await validateImageDataUrl(`data:image/png;base64,${PNG.sync.write(png).toString('base64')}`), { ok: true });
  const jpegBytes = jpeg.encode({
    data: Buffer.from([10, 10, 10, 255, 80, 80, 80, 255, 160, 160, 160, 255, 250, 250, 250, 255]),
    width: 2,
    height: 2
  }, 90).data;
  assert.deepEqual(await validateImageDataUrl(`data:image/jpeg;base64,${jpegBytes.toString('base64')}`), { ok: true });
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
