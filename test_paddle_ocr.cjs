const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { runPaddleOcrPdf, parseResult } = await import('./src/lib/paddleOcr.ts');
  assert.deepEqual(parseResult(`log before\n${JSON.stringify({ text: '內容\n{引用}' })}`), { text: '內容\n{引用}' });
  const calls = [];
  const result = await runPaddleOcrPdf(Buffer.from('pdf'), {
    scriptPath: 'D:/工作用/ocr.py',
    token: 'test-token',
    command: 'python-test',
    execute: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: `progress {not-json}\n${JSON.stringify({ status: 'TEXT_EXTRACTED', text: '忽略原始文字', transcription_confidence_regions: [{ text: '臺灣臺北地方法院', transcriptionConfidence: 0.98 }, { text: '模糊字', transcriptionConfidence: 0.42 }] })}`, stderr: '' };
    }
  });
  assert.equal(result.text, '臺灣臺北地方法院[不確定]模糊字');
  assert.equal(result.source, 'paddleocr');
  assert.equal(result.confidenceAvailable, true);
  assert.equal(result.needsManualReview, true);
  assert.equal(calls[0].command, 'python-test');
  assert.ok(calls[0].args.includes('--extract-text-only'));
  assert.ok(calls[0].args.includes('D:/工作用/ocr.py'));
  assert.equal(calls[0].options.timeout, 1800000);

  await assert.rejects(
    () => runPaddleOcrPdf(Buffer.from('pdf'), { token: '', execute: async () => ({ stdout: '', stderr: '' }) }),
    (error) => error.code === 'PADDLE_OCR_NOT_CONFIGURED'
  );
  const server = fs.readFileSync('server.ts', 'utf8');
  const ocrRoute = server.slice(server.indexOf('app.post("/api/ocr"'), server.indexOf('app.post("/api/analyze-judgment"'));
  assert.match(ocrRoute, /runPaddleOcrPdf\(/);
  assert.ok(ocrRoute.indexOf('runPaddleOcrPdf(') < ocrRoute.indexOf('createGeminiClient('));
  const component = fs.readFileSync('src/components/SmartAppealAssistant.tsx', 'utf8');
  assert.match(component, /pdfBase64:/);
  console.log('Paddle OCR tests passed');
})();
