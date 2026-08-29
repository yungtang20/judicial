const assert = require('node:assert/strict');

async function run() {
  const { splitOcrUncertainty } = await import('./src/lib/ocrMarkers.ts');
  assert.deepEqual(splitOcrUncertainty('姓名[不確定]陳?某'), [
    { text: '姓名', uncertain: false },
    { text: '[不確定]', uncertain: true },
    { text: '陳?某', uncertain: false }
  ]);
}

run().then(() => console.log('OCR marker tests passed'));
