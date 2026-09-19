import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  fetchVerifiedFile,
  preflightTemplates,
  synchronizeTemplates,
  verifySynchronizedManifest,
  validateDownloadUrl,
  validateOdtBuffer,
} from './sync-official-templates.mjs';

const official = 'https://www.judicial.gov.tw/tw/dl-123-abcdef.html';
const sourcePageUrl = 'https://www.judicial.gov.tw/tw/cp-123-abcdef-1.html';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(value);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    nameBuffer.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuffer.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

const odt = storedZip([
  ['mimetype', 'application/vnd.oasis.opendocument.text'],
  ['content.xml', '<?xml version="1.0"?><office:document-content></office:document-content>'],
]);
const pdf = Buffer.from(`%PDF-1.7\n${'x'.repeat(120)}\n%%EOF`);
const safeDns = async () => true;

test('allows only the exact official HTTPS download endpoint', () => {
  assert.equal(validateDownloadUrl(official).hostname, 'www.judicial.gov.tw');
  assert.throws(() => validateDownloadUrl('http://www.judicial.gov.tw/tw/dl-123-abcdef.html'));
  assert.throws(() => validateDownloadUrl('https://evil.example/tw/dl-123-abcdef.html'));
  assert.throws(() => validateDownloadUrl('https://www.judicial.gov.tw:444/tw/dl-123-abcdef.html'));
  assert.throws(() => validateDownloadUrl('https://user@www.judicial.gov.tw/tw/dl-123-abcdef.html'));
  assert.throws(() => validateDownloadUrl('https://www.judicial.gov.tw/tw/lp-1370-1.html'));
});

test('accepts a structurally valid ODT and rejects keyword-only or duplicate-entry ZIPs', async () => {
  validateOdtBuffer(odt);
  const result = await fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    fetchImpl: async () => new Response(odt, { headers: { 'content-type': 'application/vnd.oasis.opendocument.text' } }),
  });
  assert.equal(result.extension, '.odt');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => validateOdtBuffer(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('mimetype content.xml')])));
  assert.throws(() => validateOdtBuffer(storedZip([
    ['mimetype', 'application/vnd.oasis.opendocument.text'],
    ['content.xml', '<office:document-content/>'],
    ['content.xml', '<office:document-content/>'],
  ])));
});

test('requires matching MIME and PDF or ODT structure', async () => {
  const result = await fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    fetchImpl: async () => new Response(pdf, { headers: { 'content-type': 'application/pdf' } }),
  });
  assert.equal(result.extension, '.pdf');
  await assert.rejects(() => fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    fetchImpl: async () => new Response(odt, { headers: { 'content-type': 'text/html' } }),
  }));
});

test('validates DNS and every redirect before following it', async () => {
  await assert.rejects(() => fetchVerifiedFile(official, {
    verifyDnsSafe: async () => false,
    fetchImpl: async () => assert.fail('fetch must not run'),
  }), /Unsafe DNS/);
  await assert.rejects(() => fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/file.odt' } }),
  }), /Blocked download URL/);
});

test('retries transient responses but not policy or 404 failures', async () => {
  let transientCalls = 0;
  const result = await fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    sleep: async () => {},
    fetchImpl: async () => ++transientCalls === 1
      ? new Response(null, { status: 503 })
      : new Response(odt, { headers: { 'content-type': 'application/vnd.oasis.opendocument.text' } }),
  });
  assert.equal(result.extension, '.odt');
  assert.equal(transientCalls, 2);

  let notFoundCalls = 0;
  await assert.rejects(() => fetchVerifiedFile(official, {
    verifyDnsSafe: safeDns,
    fetchImpl: async () => { notFoundCalls += 1; return new Response(null, { status: 404 }); },
  }), /HTTP 404/);
  assert.equal(notFoundCalls, 1);
});

test('rejects declared and streamed bodies over the limit', async () => {
  await assert.rejects(() => fetchVerifiedFile(official, {
    maxBytes: 4,
    verifyDnsSafe: safeDns,
    fetchImpl: async () => new Response(odt, { headers: { 'content-type': 'application/vnd.oasis.opendocument.text' } }),
  }), /exceeds/);
});

test('preflights the complete manifest before synchronization', () => {
  const valid = { id: 'judicial-test-1', sourcePageUrl, editableFileUrl: official, pdfFileUrl: null, templateStatus: 'SOURCE_ONLY' };
  preflightTemplates([valid]);
  assert.throws(() => preflightTemplates([valid, valid]), /duplicate/);
  assert.throws(() => preflightTemplates([{ ...valid, id: '../escape' }]), /Unsafe/);
  assert.throws(() => preflightTemplates([{ ...valid, editableFileUrl: 'https://evil.example/file' }]), /Blocked/);
});

test('recovers a verified file without network and downgrades stale mappings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'official-sync-'));
  try {
    const filesDir = path.join(root, 'files');
    const manifestPath = path.join(root, 'manifest.json');
    await import('node:fs/promises').then(fs => fs.mkdir(filesDir));
    await writeFile(path.join(filesDir, 'judicial-test-1.odt'), odt);
    await writeFile(manifestPath, JSON.stringify([{
      id: 'judicial-test-1', sourcePageUrl, editableFileUrl: official, pdfFileUrl: null,
      templateStatus: 'READY_FOR_MERGE', localFilePath: null, localFileHash: null,
      downloadedAt: null, fields: [], fieldMappings: [{ key: 'x', odtStyle: 'T1' }],
    }]));
    const stats = await synchronizeTemplates({
      manifestPath, filesDir, delayMs: 0, verifyDnsSafe: safeDns,
      fetchImpl: async () => assert.fail('verified recovery must not fetch'),
    });
    const [updated] = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(stats.recovered, 1);
    assert.equal(updated.templateStatus, 'NEEDS_FIELD_MAPPING');
    assert.equal(updated.fieldMappings, undefined);
    assert.equal(updated.localFileHash, createHash('sha256').update(odt).digest('hex'));
    const verification = await verifySynchronizedManifest({ manifestPath, filesDir });
    assert.equal(verification.odt, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
