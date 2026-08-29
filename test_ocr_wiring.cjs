const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PNG } = require('pngjs');

(async () => {
  const { validateImageDataUrl } = await import('./src/lib/ocrImageValidation.ts');
  const makePng = (value) => {
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(value);
    for (let index = 3; index < png.data.length; index += 4) png.data[index] = 255;
    return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  };
  const blackPng = makePng(0);
  const whitePng = makePng(255);
  assert.equal((await validateImageDataUrl(blackPng)).ok, false);
  assert.equal((await validateImageDataUrl(whitePng)).ok, false);

  const server = fs.readFileSync('server.ts', 'utf8');
  const ocrRoute = server.slice(server.indexOf('app.post("/api/ocr"'), server.indexOf('app.post("/api/analyze-judgment"'));
  assert.match(ocrRoute, /validateImageDataUrl\(image\)/);
  assert.match(ocrRoute, /IMAGE_BLANK_OR_SOLID/);
  console.log('OCR wiring tests passed');
})();
