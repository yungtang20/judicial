const assert = require('node:assert/strict');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

(async () => {
  const { inspectPngDimensions, validateImageDataUrl, decodeInWorker } = await import('./src/lib/ocrImageValidation.ts');
  const header = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 4, 'ascii');
  header.writeUInt32BE(10000, 16);
  header.writeUInt32BE(10000, 20);
  assert.deepEqual(inspectPngDimensions(header), { width: 10000, height: 10000 });
  let decodeCalled = false;
  const originalRead = PNG.sync.read;
  PNG.sync.read = () => { decodeCalled = true; throw new Error('sync decoder must not run'); };
  assert.deepEqual(await validateImageDataUrl(`data:image/png;base64,${header.toString('base64')}`), {
    ok: false,
    error: 'IMAGE_DIMENSIONS_TOO_LARGE'
  });
  PNG.sync.read = originalRead;
  assert.equal(decodeCalled, false);
  const png = new PNG({ width: 2, height: 1 });
  png.data.set([10, 20, 30, 255, 240, 230, 220, 255]);
  const validPng = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  assert.deepEqual(await validateImageDataUrl(validPng), { ok: true });
  const workerPngResult = await decodeInWorker('image/png', PNG.sync.write(png), 2000);
  assert.deepEqual({ min: workerPngResult.min, max: workerPngResult.max }, { min: 10, max: 240 });
  assert.deepEqual(await validateImageDataUrl(validPng, { timeoutMs: 0 }), { ok: false, error: 'IMAGE_DECODE_TIMEOUT' });

  const jpegData = jpeg.encode({ data: Buffer.from([10, 20, 30, 255, 240, 230, 220, 255]), width: 2, height: 1 }, 90).data;
  const validJpeg = `data:image/jpeg;base64,${jpegData.toString('base64')}`;
  assert.deepEqual(await validateImageDataUrl(validJpeg), { ok: true });

  let heartbeat = false;
  setTimeout(() => { heartbeat = true; }, 10);
  const largePng = new PNG({ width: 2000, height: 2000 });
  largePng.data.fill(128);
  for (let index = 3; index < largePng.data.length; index += 4) largePng.data[index] = 255;
  const largeDataUrl = `data:image/png;base64,${PNG.sync.write(largePng).toString('base64')}`;
  const results = await Promise.all([largeDataUrl, largeDataUrl, largeDataUrl].map((dataUrl) => validateImageDataUrl(dataUrl)));
  assert.equal(results.length, 3);
  assert.equal(heartbeat, true);
  console.log('OCR bomb protection tests passed');
})();
