import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { verifyDnsSafe as projectVerifyDnsSafe } from '../server/routes/fetchUrl.ts';

const DEFAULT_ALLOWED_HOSTS = new Set(['www.judicial.gov.tw']);
const ODT_MIME = 'application/vnd.oasis.opendocument.text';
const PDF_MIME = 'application/pdf';
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2048;
const MAX_REDIRECTS = 5;
const MANIFEST_PATH = path.resolve('data/official-templates/manifest.json');
const FILES_DIR = path.resolve('data/official-templates/files');
const VALID_STATUSES = new Set(['DOWNLOADED', 'NEEDS_FIELD_MAPPING', 'READY_FOR_MERGE', 'SOURCE_ONLY', 'OUTDATED', 'DOWNLOAD_FAILED']);

class DownloadError extends Error {
  constructor(message, retryable = false, retryAfterMs = 0) {
    super(message);
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

export function validateDownloadUrl(rawUrl, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || (url.port && url.port !== '443')) {
    throw new DownloadError(`Blocked download URL: ${url.origin}`);
  }
  if (!/^\/tw\/dl-\d+-[a-f0-9]+\.html$/i.test(url.pathname) || url.username || url.password) {
    throw new DownloadError(`Unexpected Judicial Yuan download path: ${url.pathname}`);
  }
  return url;
}

function validateSourcePageUrl(rawUrl, allowedHosts) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || (url.port && url.port !== '443') || url.username || url.password) {
    throw new Error(`Blocked source page URL: ${url.origin}`);
  }
  if (!/^\/tw\/cp-\d+-[a-z0-9-]+\.html$/i.test(url.pathname)) throw new Error(`Unexpected source page path: ${url.pathname}`);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validateZipPath(name) {
  const normalized = name.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new DownloadError(`Unsafe ZIP entry: ${name}`);
  }
}

export function readOdtEntries(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw new DownloadError('Invalid ODT ZIP header');
  const names = new Set();
  const entries = new Map();
  let offset = 0;
  let totalUncompressed = 0;

  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    if (names.size >= MAX_ZIP_ENTRIES) throw new DownloadError('ODT has too many ZIP entries');
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const expectedCrc = buffer.readUInt32LE(offset + 14);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if ((flags & 0x0001) || (flags & 0x0008)) throw new DownloadError('Encrypted or descriptor ZIP entries are not supported');
    if (method !== 0 && method !== 8) throw new DownloadError(`Unsupported ZIP compression method: ${method}`);
    const dataOffset = offset + 30 + nameLength + extraLength;
    const end = dataOffset + compressedSize;
    if (!nameLength || dataOffset > buffer.length || end > buffer.length) throw new DownloadError('Truncated ODT ZIP entry');
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    validateZipPath(name);
    if (names.has(name)) throw new DownloadError(`Duplicate ZIP entry: ${name}`);
    names.add(name);
    totalUncompressed += uncompressedSize;
    if (uncompressedSize > MAX_BYTES || totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new DownloadError('ODT uncompressed size exceeds limit');

    const compressed = buffer.subarray(dataOffset, end);
    let data;
    try {
      data = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: MAX_BYTES });
    } catch {
      throw new DownloadError(`Invalid compressed ZIP entry: ${name}`);
    }
    if (data.length !== uncompressedSize || crc32(data) !== expectedCrc) throw new DownloadError(`Corrupt ZIP entry: ${name}`);
    entries.set(name, data);
    offset = end;
  }

  if (buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset) < 0 || buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) < 0) {
    throw new DownloadError('ODT ZIP central directory is missing');
  }
  if (entries.get('mimetype')?.toString('utf8') !== ODT_MIME) throw new DownloadError('ODT mimetype entry is missing or invalid');
  const contentXml = entries.get('content.xml')?.toString('utf8');
  if (!contentXml?.includes('<office:document-content')) throw new DownloadError('ODT content.xml is missing or invalid');
  return entries;
}

export function validateOdtBuffer(buffer) {
  readOdtEntries(buffer);
}

export function validatePdfBuffer(buffer) {
  if (buffer.length < 100 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-' || !buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) {
    throw new DownloadError('Invalid PDF structure');
  }
}

function detectFile(buffer, contentType) {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mime === ODT_MIME) {
    validateOdtBuffer(buffer);
    return { extension: '.odt', mime: ODT_MIME };
  }
  if (mime === PDF_MIME) {
    validatePdfBuffer(buffer);
    return { extension: '.pdf', mime: PDF_MIME };
  }
  throw new DownloadError(`Rejected download type: ${mime || 'missing content-type'}`);
}

async function readBoundedBody(response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new DownloadError(`Download exceeds ${maxBytes} bytes`);
  if (!response.body) throw new DownloadError('Download response has no body');
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) throw new DownloadError(`Download exceeds ${maxBytes} bytes`);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function retryAfterMs(response) {
  const raw = response.headers.get('retry-after');
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

async function fetchOnce(rawUrl, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const allowedHosts = options.allowedHosts || DEFAULT_ALLOWED_HOSTS;
  const dnsCheck = options.verifyDnsSafe || projectVerifyDnsSafe;
  let url = validateDownloadUrl(rawUrl, allowedHosts);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!await dnsCheck(url.hostname)) throw new DownloadError(`Unsafe DNS resolution: ${url.hostname}`);
    let response;
    try {
      response = await fetchImpl(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs || 30_000),
        headers: { 'user-agent': 'Smart-Legal-Assistant/1.0 official-template-sync' },
      });
    } catch (error) {
      throw new DownloadError(`Network failure: ${error.message}`, true);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) throw new DownloadError('Invalid or excessive redirect');
      url = validateDownloadUrl(new URL(location, url).href, allowedHosts);
      continue;
    }
    if ([408, 429].includes(response.status) || response.status >= 500) {
      throw new DownloadError(`HTTP ${response.status}`, true, retryAfterMs(response));
    }
    if (!response.ok) throw new DownloadError(`HTTP ${response.status}`);

    const buffer = await readBoundedBody(response, options.maxBytes || MAX_BYTES);
    const file = detectFile(buffer, response.headers.get('content-type') || '');
    return { ...file, buffer, finalUrl: url.href, sha256: createHash('sha256').update(buffer).digest('hex') };
  }
  throw new DownloadError('Redirect limit reached');
}

export async function fetchVerifiedFile(rawUrl, options = {}) {
  const retries = options.retries ?? 2;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchOnce(rawUrl, options);
    } catch (error) {
      if (!error.retryable || attempt >= retries) throw error;
      const delay = error.retryAfterMs || (options.retryBaseMs ?? 500) * (2 ** attempt) + Math.floor(Math.random() * 100);
      await sleep(delay);
    }
  }
}

export function preflightTemplates(templates, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  if (!Array.isArray(templates) || templates.length === 0) throw new Error('Manifest must be a non-empty array');
  const ids = new Set();
  for (const template of templates) {
    if (!template || !/^[a-z0-9-]+$/i.test(template.id) || ids.has(template.id)) throw new Error(`Unsafe or duplicate template id: ${template?.id}`);
    ids.add(template.id);
    if (!VALID_STATUSES.has(template.templateStatus)) throw new Error(`Invalid template status: ${template.id}`);
    validateSourcePageUrl(template.sourcePageUrl, allowedHosts);
    if (template.editableFileUrl) validateDownloadUrl(template.editableFileUrl, allowedHosts);
    if (template.pdfFileUrl) validateDownloadUrl(template.pdfFileUrl, allowedHosts);
    if (!template.editableFileUrl && !template.pdfFileUrl) throw new Error(`Template has no file URL: ${template.id}`);
  }
}

function containedPath(filesDir, localFilePath) {
  const resolved = path.resolve(localFilePath);
  const relative = path.relative(filesDir, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? resolved : null;
}

async function inspectExisting(template, filesDir) {
  const candidates = [];
  if (template.localFilePath) candidates.push({ filePath: containedPath(filesDir, template.localFilePath), fromManifest: true });
  candidates.push(
    { filePath: path.join(filesDir, `${template.id}.odt`), fromManifest: false },
    { filePath: path.join(filesDir, `${template.id}.pdf`), fromManifest: false },
  );

  for (const candidate of candidates) {
    if (!candidate.filePath || !existsSync(candidate.filePath)) continue;
    try {
      const buffer = await readFile(candidate.filePath);
      const extension = path.extname(candidate.filePath).toLowerCase();
      if (extension === '.odt') validateOdtBuffer(buffer);
      else if (extension === '.pdf') validatePdfBuffer(buffer);
      else continue;
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const unchanged = candidate.fromManifest && sha256 === template.localFileHash;
      return { filePath: candidate.filePath, extension, sha256, unchanged };
    } catch {}
  }
  return null;
}

async function saveAtomically(target, buffer) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, buffer, { flag: 'wx' });
  try {
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

function applyFileMetadata(template, file, preserveStatus) {
  template.localFilePath = path.relative(process.cwd(), file.filePath).replaceAll('\\', '/');
  template.localFileHash = file.sha256;
  template.downloadedAt ||= new Date().toISOString();
  if (!preserveStatus) {
    template.templateStatus = file.extension === '.odt' ? 'NEEDS_FIELD_MAPPING' : 'DOWNLOADED';
    delete template.fieldMappings;
    delete template.fieldMappingHash;
  }
}

export async function synchronizeTemplates(options = {}) {
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  const filesDir = options.filesDir || FILES_DIR;
  const templates = JSON.parse(await readFile(manifestPath, 'utf8'));
  preflightTemplates(templates, options.allowedHosts || DEFAULT_ALLOWED_HOSTS);
  const stats = { downloaded: 0, recovered: 0, skipped: 0, failed: 0, odt: 0, pdf: 0 };
  await mkdir(filesDir, { recursive: true });

  for (const [index, template] of templates.entries()) {
    const existing = await inspectExisting(template, filesDir);
    if (existing) {
      applyFileMetadata(template, existing, existing.unchanged);
      stats[existing.unchanged ? 'skipped' : 'recovered'] += 1;
      stats[existing.extension === '.odt' ? 'odt' : 'pdf'] += 1;
      continue;
    }

    const sourceUrl = template.editableFileUrl || template.pdfFileUrl;
    try {
      const result = await fetchVerifiedFile(sourceUrl, options);
      const target = path.join(filesDir, `${template.id}${result.extension}`);
      await saveAtomically(target, result.buffer);
      applyFileMetadata(template, { filePath: target, extension: result.extension, sha256: result.sha256 }, false);
      stats.downloaded += 1;
      stats[result.extension === '.odt' ? 'odt' : 'pdf'] += 1;
    } catch (error) {
      template.localFilePath = null;
      template.localFileHash = null;
      template.downloadedAt = null;
      template.templateStatus = 'DOWNLOAD_FAILED';
      delete template.fieldMappings;
      delete template.fieldMappingHash;
      stats.failed += 1;
      console.error(`[${index + 1}/${templates.length}] ${template.id} FAILED: ${error.message}`);
    }
    if (options.delayMs !== 0) await new Promise(resolve => setTimeout(resolve, options.delayMs || 100));
    if ((index + 1) % 25 === 0 || index + 1 === templates.length) {
      console.log(`[${index + 1}/${templates.length}] downloaded=${stats.downloaded} recovered=${stats.recovered} skipped=${stats.skipped} failed=${stats.failed}`);
    }
  }

  const temporaryManifest = `${manifestPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryManifest, `${JSON.stringify(templates, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryManifest, manifestPath);
  return { total: templates.length, ...stats };
}

export async function verifySynchronizedManifest(options = {}) {
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  const filesDir = options.filesDir || FILES_DIR;
  const templates = JSON.parse(await readFile(manifestPath, 'utf8'));
  preflightTemplates(templates, options.allowedHosts || DEFAULT_ALLOWED_HOSTS);
  const stats = { total: templates.length, odt: 0, pdf: 0, totalBytes: 0, maxBytes: 0 };

  for (const template of templates) {
    if (!template.localFilePath || !template.localFileHash) throw new Error(`Missing local file metadata: ${template.id}`);
    const filePath = containedPath(filesDir, template.localFilePath);
    if (!filePath || !existsSync(filePath)) throw new Error(`Missing or unsafe local file: ${template.id}`);
    const buffer = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.odt') validateOdtBuffer(buffer);
    else if (extension === '.pdf') validatePdfBuffer(buffer);
    else throw new Error(`Unsupported local file extension: ${template.id}`);
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hash !== template.localFileHash) throw new Error(`Hash mismatch: ${template.id}`);
    if (extension === '.odt' && template.templateStatus !== 'NEEDS_FIELD_MAPPING' && template.templateStatus !== 'READY_FOR_MERGE') {
      throw new Error(`Invalid ODT status: ${template.id}`);
    }
    if (extension === '.pdf' && template.templateStatus !== 'DOWNLOADED') throw new Error(`Invalid PDF status: ${template.id}`);
    stats[extension === '.odt' ? 'odt' : 'pdf'] += 1;
    stats.totalBytes += buffer.length;
    stats.maxBytes = Math.max(stats.maxBytes, buffer.length);
  }
  return stats;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const operation = process.argv.includes('--verify-only') ? verifySynchronizedManifest() : synchronizeTemplates();
  operation
    .then(stats => {
      console.log(JSON.stringify(stats));
      if (stats.failed) process.exitCode = 1;
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
