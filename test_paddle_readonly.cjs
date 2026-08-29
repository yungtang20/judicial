const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function makePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length 44 >>\nstream\nBT /F1 18 Tf 72 720 Td (OCR smoke test) Tj ET\nendstream'
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
  const entries = [];
  for (const name of fs.readdirSync(root)) {
    const file = path.join(root, name);
    const stat = fs.statSync(file);
    entries.push(`${name}:${stat.isFile() ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : 'directory'}`);
  }
  return entries.sort();
}

if (process.env.PADDLE_OCR_REAL_TEST !== '1') {
  console.log('Paddle readonly smoke test skipped (set PADDLE_OCR_REAL_TEST=1 to run against the real script/API)');
} else {
  assert.ok(process.env.PADDLE_OCR_TOKEN, 'PADDLE_OCR_TOKEN is required for the real smoke test');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paddle-readonly-'));
  const pdfPath = path.join(root, 'test.pdf');
  fs.writeFileSync(pdfPath, makePdf());
  const before = snapshot(root);
  const run = spawnSync('python', ['D:/工作用/ocr.py', pdfPath, '--extract-text-only', '--poll-timeout', '120', '--max-chars', '100'], {
    env: process.env,
    encoding: 'utf8',
    timeout: 180000
  });
  const after = snapshot(root);
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.deepEqual(after, before);
  console.log('Paddle readonly smoke test passed');
}
