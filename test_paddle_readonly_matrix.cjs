const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function makePdf(text) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length + 37} >>\nstream\nBT /F1 18 Tf 72 720 Td (${text}) Tj ET\nendstream`
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

function snapshot(root) {
  return fs.readdirSync(root).sort().map((name) => {
    const file = path.join(root, name);
    const stat = fs.statSync(file);
    return `${name}:${stat.isFile() ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : 'directory'}`;
  });
}

if (process.env.PADDLE_OCR_REAL_MATRIX !== '1') {
  console.log('Paddle readonly matrix skipped (set PADDLE_OCR_REAL_MATRIX=1 to run 10 real invocations)');
} else {
  assert.ok(process.env.PADDLE_OCR_TOKEN, 'PADDLE_OCR_TOKEN is required for the real matrix');
  for (let run = 0; run < 10; run += 1) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `paddle-readonly-matrix-${run}-`));
    const pdfPath = path.join(root, 'test.pdf');
    fs.writeFileSync(pdfPath, run % 3 === 0 ? Buffer.from('not-a-pdf') : run % 3 === 1 ? makePdf('OCR smoke test') : makePdf(''));
    const before = snapshot(root);
    const result = spawnSync('python', ['D:/工作用/ocr.py', pdfPath, '--extract-text-only', '--poll-timeout', '90', '--max-chars', '100'], {
      env: process.env,
      encoding: 'utf8',
      timeout: 180000
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.ok(result.status === 0 || result.status === 1, `unexpected exit status ${result.status}`);
    assert.deepEqual(snapshot(root), before, `filesystem changed on run ${run + 1}`);
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('Paddle readonly matrix passed: 10 runs');
}
