import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'official-source-stress-test-secret-2026-only';
process.env.ALLOW_GUEST_MODE = 'true';
process.env.TRUST_PROXY = '1';
process.env.AUDIT_DB_PATH = ':memory:';

const manifestPath = path.resolve('data/official-templates/manifest.json');
const manifestBefore = await readFile(manifestPath);
const manifest = JSON.parse(manifestBefore.toString('utf8'));
const { createExpressApp } = await import('../server/index.ts');
const server = createExpressApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const hash = value => createHash('sha256').update(value).digest('hex');
const clientIp = index => `198.51.100.${(index % 4) + 1}`;
const output = console.log.bind(console);
console.log = () => {};
let summary;

async function request(url, init = {}, index = 0) {
  return fetch(`${baseUrl}${url}`, {
    ...init,
    headers: { 'X-Forwarded-For': clientIp(index), ...(init.headers || {}) },
  });
}

async function inBatches(items, size, worker) {
  const results = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(...await Promise.all(items.slice(start, start + size).map((item, offset) => worker(item, start + offset))));
  }
  return results;
}

try {
  const guest = await request('/api/auth/guest', { method: 'POST' }, 10);
  if (!guest.ok) throw new Error(`guest token failed: ${guest.status}`);
  const token = (await guest.json()).token;
  const auth = { Authorization: `Bearer ${token}` };

  let totalBytes = 0;
  await inBatches(manifest, 25, async (template, index) => {
    const response = await request(`/api/official-templates/${template.id}/source`, { headers: auth }, index);
    if (response.status !== 200) throw new Error(`${template.id}: HTTP ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const extension = template.localFilePath.endsWith('.odt') ? '.odt' : '.pdf';
    const expectedType = extension === '.odt' ? 'application/vnd.oasis.opendocument.text' : 'application/pdf';
    if (!response.headers.get('content-type')?.includes(expectedType)) throw new Error(`${template.id}: MIME mismatch`);
    if (response.headers.get('content-disposition') !== `attachment; filename="${template.id}${extension}"`) {
      throw new Error(`${template.id}: filename mismatch`);
    }
    if (hash(source) !== template.localFileHash) throw new Error(`${template.id}: response hash mismatch`);
    totalBytes += source.length;
  });
  if (totalBytes !== 11_783_600) throw new Error(`total bytes mismatch: ${totalBytes}`);

  const timings = await Promise.all(Array.from({ length: 120 }, async (_, index) => {
    const template = manifest[(index * 37) % manifest.length];
    const started = performance.now();
    const response = await request(`/api/official-templates/${template.id}/source`, {
      headers: { ...auth, 'X-Forwarded-For': '203.0.113.20' },
    }, 20);
    const source = Buffer.from(await response.arrayBuffer());
    if (response.status !== 200 || hash(source) !== template.localFileHash) throw new Error(`concurrent mismatch: ${template.id}`);
    return performance.now() - started;
  }));
  timings.sort((a, b) => a - b);

  const adversarial = [
    ['/api/official-templates/judicial-0202-1/source', {}, 401],
    ['/api/official-templates/judicial-0202-1/source', { headers: { Authorization: 'Bearer forged.token.value' } }, 401],
    ['/api/official-templates/not-a-template/source', { headers: auth }, 404],
    ['/api/official-templates/..%2Fmanifest.json/source', { headers: auth }, 404],
    ['/api/official-templates/%2e%2e%2f%2e%2e%2fpackage.json/source', { headers: auth }, 404],
    ['/api/official-templates/judicial-0202-1/source/extra', { headers: auth }, 404],
    ['/api/official-templates/judicial-0202-1/source', { method: 'POST', headers: auth }, 404],
    [`/api/official-templates/${'x'.repeat(4096)}/source`, { headers: auth }, 404],
  ];
  for (const [url, init, expected] of adversarial) {
    const response = await request(url, init, 30);
    const body = await response.text();
    if (response.status !== expected) throw new Error(`${url}: expected ${expected}, got ${response.status}`);
    if (/[A-Z]:\\|node_modules|at\s+\S+\.tsx?:\d+/i.test(body)) throw new Error(`${url}: internal path or stack leaked`);
  }

  const manifestAfter = await readFile(manifestPath);
  if (hash(manifestAfter) !== hash(manifestBefore)) throw new Error('manifest changed during source downloads');
  const statusCounts = Object.fromEntries(['NEEDS_FIELD_MAPPING', 'DOWNLOADED', 'READY_FOR_MERGE']
    .map(status => [status, manifest.filter(template => template.templateStatus === status).length]));
  if (statusCounts.NEEDS_FIELD_MAPPING !== 655 || statusCounts.DOWNLOADED !== 30 || statusCounts.READY_FOR_MERGE !== 0) {
    throw new Error(`status drift: ${JSON.stringify(statusCounts)}`);
  }

  summary = {
    templates: manifest.length,
    totalBytes,
    concurrency: timings.length,
    latencyMs: {
      p50: Math.round(timings[Math.floor(timings.length * 0.50)]),
      p95: Math.round(timings[Math.floor(timings.length * 0.95)]),
      max: Math.round(timings.at(-1)),
    },
    adversarial: adversarial.length,
    statusCounts,
  };
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  console.log = output;
}
output(JSON.stringify(summary));
