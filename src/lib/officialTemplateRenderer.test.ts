/**
 * Official Template Renderer — Unit Tests
 * Covers: ZIP parsing, field mapping, field replacement, ODT rebuild, renderTemplate paths
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { renderTemplate, extractTemplateFields } from './officialTemplateRenderer';
import type { OfficialTemplate, RenderTemplateResponse } from '../types/officialTemplate';

/* ------------------------------------------------------------------ */
/*  Mock manifest — avoid hitting real data/official-templates/        */
/* ------------------------------------------------------------------ */
const mockTemplates = new Map<string, OfficialTemplate>();

vi.mock('./officialTemplateManifest', () => ({
  loadManifest: () => ({
    verifiedOn: null,
    totalTemplates: mockTemplates.size,
    templates: [...mockTemplates.values()],
  }),
  getTemplateById: (id: string) => mockTemplates.get(id) ?? null,
  getTemplatesByCategory: (cat: string) =>
    [...mockTemplates.values()].filter(t => t.category === cat),
  getAllCategories: () =>
    [...new Set([...mockTemplates.values()].map(t => t.category))],
  updateTemplateStatus: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  Helpers — build minimal ODT (ZIP with content.xml)                 */
/* ------------------------------------------------------------------ */
function crc32(buf: Buffer): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Build a minimal ZIP containing a single `content.xml` entry (stored, method=0). */
function buildStoredOdt(contentXml: string): Buffer {
  const nameBuf = Buffer.from('content.xml', 'utf-8');
  const dataBuf = Buffer.from(contentXml, 'utf-8');
  const headerLen = 30 + nameBuf.length;

  // Local file header
  const local = Buffer.alloc(headerLen);
  local.writeUInt32LE(0x04034b50, 0);   // PK signature
  local.writeUInt16LE(20, 4);           // version needed
  local.writeUInt16LE(0, 6);            // flags
  local.writeUInt16LE(0, 8);            // compression: stored
  local.writeUInt16LE(0, 10);           // mod time
  local.writeUInt16LE(0, 12);           // mod date
  local.writeUInt32LE(crc32(dataBuf), 14);
  local.writeUInt32LE(dataBuf.length, 18);  // compressed size
  local.writeUInt32LE(dataBuf.length, 22);  // uncompressed size
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);           // extra field length
  nameBuf.copy(local, 30);

  // Central directory entry
  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc32(dataBuf), 16);
  central.writeUInt32LE(dataBuf.length, 20);
  central.writeUInt32LE(dataBuf.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);         // offset
  nameBuf.copy(central, 46);

  const centralDirOffset = local.length + dataBuf.length;
  const centralDirBuf = central;

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local, dataBuf, centralDirBuf, eocd]);
}

/** Build a minimal ZIP with content.xml using deflate (method=8), no data descriptor. */
function buildDeflatedOdt(contentXml: string): Buffer {
  const nameBuf = Buffer.from('content.xml', 'utf-8');
  const rawBuf = Buffer.from(contentXml, 'utf-8');
  const rawDeflated = deflateRawSync(rawBuf);
  const rawCrc = crc32(rawBuf);

  const headerLen = 30 + nameBuf.length;
  const local = Buffer.alloc(headerLen);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);             // no data descriptor flag
  local.writeUInt16LE(8, 8);            // compression: deflated
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(rawCrc, 14);
  local.writeUInt32LE(rawDeflated.length, 18);  // compressed size
  local.writeUInt32LE(rawBuf.length, 22);       // uncompressed size
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuf.copy(local, 30);

  // Central directory
  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(rawCrc, 16);
  central.writeUInt32LE(rawDeflated.length, 20);
  central.writeUInt32LE(rawBuf.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  const centralDirOffset = local.length + rawDeflated.length;
  central.writeUInt32LE(centralDirOffset, 42);
  nameBuf.copy(central, 46);

  const centralDirBuf = central;

  // EOCD
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local, rawDeflated, centralDirBuf, eocd]);
}

/** ZIP with two entries but no content.xml. */
function buildNoContentXmlOdt(): Buffer {
  const nameBuf = Buffer.from('mimetype', 'utf-8');
  const dataBuf = Buffer.from('application/vnd.oasis.opendocument.text', 'utf-8');
  const headerLen = 30 + nameBuf.length;
  const local = Buffer.alloc(headerLen);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(crc32(dataBuf), 14);
  local.writeUInt32LE(dataBuf.length, 18);
  local.writeUInt32LE(dataBuf.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuf.copy(local, 30);

  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc32(dataBuf), 16);
  central.writeUInt32LE(dataBuf.length, 20);
  central.writeUInt32LE(dataBuf.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  nameBuf.copy(central, 46);

  const centralDirOffset = local.length + dataBuf.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local, dataBuf, central, eocd]);
}

/** ZIP with two entries: mimetype + content.xml with T11/T12/T17 spans. */
function buildTwoEntryOdt(contentXml: string): Buffer {
  const name1 = Buffer.from('mimetype', 'utf-8');
  const data1 = Buffer.from('application/vnd.oasis.opendocument.text', 'utf-8');
  const header1Len = 30 + name1.length;
  const local1 = Buffer.alloc(header1Len);
  local1.writeUInt32LE(0x04034b50, 0);
  local1.writeUInt16LE(20, 4);
  local1.writeUInt16LE(0, 6);
  local1.writeUInt16LE(0, 8);
  local1.writeUInt16LE(0, 10);
  local1.writeUInt16LE(0, 12);
  local1.writeUInt32LE(crc32(data1), 14);
  local1.writeUInt32LE(data1.length, 18);
  local1.writeUInt32LE(data1.length, 22);
  local1.writeUInt16LE(name1.length, 26);
  local1.writeUInt16LE(0, 28);
  name1.copy(local1, 30);

  const name2 = Buffer.from('content.xml', 'utf-8');
  const data2 = Buffer.from(contentXml, 'utf-8');
  const header2Len = 30 + name2.length;
  const local2 = Buffer.alloc(header2Len);
  local2.writeUInt32LE(0x04034b50, 0);
  local2.writeUInt16LE(20, 4);
  local2.writeUInt16LE(0, 6);
  local2.writeUInt16LE(0, 8);
  local2.writeUInt16LE(0, 10);
  local2.writeUInt16LE(0, 12);
  local2.writeUInt32LE(crc32(data2), 14);
  local2.writeUInt32LE(data2.length, 18);
  local2.writeUInt32LE(data2.length, 22);
  local2.writeUInt16LE(name2.length, 26);
  local2.writeUInt16LE(0, 28);
  name2.copy(local2, 30);

  // Build central directory for both entries
  const c1 = Buffer.alloc(46 + name1.length);
  c1.writeUInt32LE(0x02014b50, 0);
  c1.writeUInt16LE(20, 4); c1.writeUInt16LE(20, 6);
  c1.writeUInt16LE(0, 8); c1.writeUInt16LE(0, 10);
  c1.writeUInt16LE(0, 12); c1.writeUInt16LE(0, 14);
  c1.writeUInt32LE(crc32(data1), 16);
  c1.writeUInt32LE(data1.length, 20);
  c1.writeUInt32LE(data1.length, 24);
  c1.writeUInt16LE(name1.length, 28);
  c1.writeUInt16LE(0, 30); c1.writeUInt16LE(0, 32);
  c1.writeUInt16LE(0, 34); c1.writeUInt16LE(0, 36);
  c1.writeUInt32LE(0, 38);
  c1.writeUInt32LE(0, 42);
  name1.copy(c1, 46);

  const offset2 = local1.length + data1.length;
  const c2 = Buffer.alloc(46 + name2.length);
  c2.writeUInt32LE(0x02014b50, 0);
  c2.writeUInt16LE(20, 4); c2.writeUInt16LE(20, 6);
  c2.writeUInt16LE(0, 8); c2.writeUInt16LE(0, 10);
  c2.writeUInt16LE(0, 12); c2.writeUInt16LE(0, 14);
  c2.writeUInt32LE(crc32(data2), 16);
  c2.writeUInt32LE(data2.length, 20);
  c2.writeUInt32LE(data2.length, 24);
  c2.writeUInt16LE(name2.length, 28);
  c2.writeUInt16LE(0, 30); c2.writeUInt16LE(0, 32);
  c2.writeUInt16LE(0, 34); c2.writeUInt16LE(0, 36);
  c2.writeUInt32LE(0, 38);
  c2.writeUInt32LE(offset2, 42);
  name2.copy(c2, 46);

  const centralBuf = Buffer.concat([c1, c2]);
  const centralDirOffset = local1.length + data1.length + local2.length + data2.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(2, 8); eocd.writeUInt16LE(2, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local1, data1, local2, data2, centralBuf, eocd]);
}

/** Template XML with three underline spans T11/T12/T17 */
function contentXml(spans?: { t11?: string; t12?: string; t17?: string }): string {
  const v11 = spans?.t11 ?? '';
  const v12 = spans?.t12 ?? '';
  const v17 = spans?.t17 ?? '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:text xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
             xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <text:p>案件字號：<text:span text:style-name="T11">${v11}</text:span></text:p>
  <text:p>被告姓名：<text:span text:style-name="T12">${v12}</text:span></text:p>
  <text:p>答辯要旨：<text:span text:style-name="T17">${v17}</text:span></text:p>
</office:text>`;
}

const TMP = path.resolve(process.cwd(), 'tmp', 'renderer-test');

function mkdirp(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(rel: string, buf: Buffer) {
  const full = path.join(TMP, rel);
  mkdirp(path.dirname(full));
  fs.writeFileSync(full, buf);
  return full;
}

function makeTemplate(overrides: Partial<OfficialTemplate> & { id: string }): OfficialTemplate {
  return {
    category: '刑事',
    code: '0202',
    name: '刑事答辯狀',
    sourcePageUrl: 'https://www.judicial.gov.tw/tw/law-1.html',
    editableFileUrl: 'https://www.judicial.gov.tw/tw/law-2.odt',
    pdfFileUrl: 'https://www.judicial.gov.tw/tw/law-2.pdf',
    officialUpdatedAt: '2024-01-01',
    localFilePath: null,
    localFileHash: null,
    templateStatus: 'SOURCE_ONLY',
    fields: [],
    downloadedAt: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mockTemplates.clear();
  vi.restoreAllMocks();
  mkdirp(TMP);
});

afterEach(() => {
  // Clean up tmp dir
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ok */ }
});

/* ---------- renderTemplate: status / not-found gates ---------- */
describe('renderTemplate — status gates', () => {
  it('TEMPLATE_NOT_FOUND for non-existent id', () => {
    const r = renderTemplate('does-not-exist', {});
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('TEMPLATE_MAPPING_INCOMPLETE for NEEDS_FIELD_MAPPING', () => {
    mockTemplates.set('t1', makeTemplate({
      id: 't1',
      templateStatus: 'NEEDS_FIELD_MAPPING',
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));
    const r = renderTemplate('t1', { caseNumber: '113訴123' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
  });

  it('TEMPLATE_NOT_RENDERABLE for OUTDATED status', () => {
    mockTemplates.set('t2', makeTemplate({
      id: 't2',
      templateStatus: 'OUTDATED',
    }));
    const r = renderTemplate('t2', {});
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_NOT_RENDERABLE');
  });

  it('TEMPLATE_NOT_RENDERABLE for DOWNLOAD_FAILED status', () => {
    mockTemplates.set('t2b', makeTemplate({
      id: 't2b',
      templateStatus: 'DOWNLOAD_FAILED',
    }));
    const r = renderTemplate('t2b', {});
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_NOT_RENDERABLE');
  });

  it('TEMPLATE_NOT_DOWNLOADED when localFilePath is null', () => {
    mockTemplates.set('t3', makeTemplate({
      id: 't3',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: null,
      fields: [{ key: 'caseNumber', label: '案號', type: 'text', required: false }],
    }));
    const r = renderTemplate('t3', { caseNumber: 'X' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_NOT_DOWNLOADED');
  });

  it('TEMPLATE_FILE_MISSING when file does not exist on disk', () => {
    mockTemplates.set('t4', makeTemplate({
      id: 't4',
      templateStatus: 'DOWNLOADED',
      localFilePath: 'data/official-templates/files/nonexistent.odt',
      fields: [{ key: 'caseNumber', label: '案號', type: 'text', required: false }],
    }));
    const r = renderTemplate('t4', { caseNumber: 'X' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_FILE_MISSING');
  });

  it('TEMPLATE_MAPPING_INCOMPLETE when required field lacks ODT position (>3 fields)', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-t5.odt', odtBuf);

    mockTemplates.set('t5', makeTemplate({
      id: 't5',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'a', label: 'A', type: 'text', required: true },
        { key: 'b', label: 'B', type: 'text', required: true },
        { key: 'c', label: 'C', type: 'text', required: true },
        { key: 'd', label: 'D', type: 'text', required: true },
      ],
    }));
    // T11/T12/T17 only map to first 3 fields; 'd' is 4th required → unmapped
    const r = renderTemplate('t5', { a: '1', b: '2', c: '3', d: '4' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
    expect(r.missingFields).toContain('d');
  });
});

  it('P9_READY rejects generic and unmapped optional fields', () => {
    const xml = contentXml();
    const abs = writeFile('test-p9-allowlist.odt', buildStoredOdt(xml));
    mockTemplates.set('p9-allowlist', makeTemplate({
      id: 'p9-allowlist',
      templateStatus: 'READY_FOR_MERGE',
      p9Status: 'P9_READY',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: false },
        { key: 'partyName', label: '當事人', type: 'text', required: false },
        { key: 'facts', label: '事實', type: 'textarea', required: false },
        { key: 'optionalUnmapped', label: '未映射欄位', type: 'text', required: false },
      ],
    }));

    expect(renderTemplate('p9-allowlist', { field_0: 'generic' }).code).toBe('TEMPLATE_FIELD_NOT_ALLOWED');
    expect(renderTemplate('p9-allowlist', {
      caseNumber: '113訴1',
      partyName: '甲',
      facts: '事實',
      optionalUnmapped: '不得放行',
    }).code).toBe('TEMPLATE_FIELD_NOT_ALLOWED');
  });

  it('P9_READY rejects a manifest field whose ODT span is missing', () => {
    const xml = contentXml()
      .replace(/<text:span text:style-name="T12">[\s\S]*?<\/text:span>/, '')
      .replace(/<text:span text:style-name="T17">[\s\S]*?<\/text:span>/, '');
    const abs = writeFile('test-p9-missing-span.odt', buildStoredOdt(xml));
    mockTemplates.set('p9-missing-span', makeTemplate({
      id: 'p9-missing-span',
      templateStatus: 'READY_FOR_MERGE',
      p9Status: 'P9_READY',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'partyName', label: '當事人', type: 'text', required: false },
        { key: 'facts', label: '事實', type: 'textarea', required: false },
      ],
    }));

    const result = renderTemplate('p9-missing-span', { caseNumber: '113訴1', partyName: '甲', facts: '事實' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
    expect(result.missingFields).toContain('partyName');
    expect(result.missingFields).toContain('facts');
  });

  it('P9_READY rejects duplicate ODT spans for one mapped field', () => {
    const xml = contentXml().replace(
      '</office:text>',
      '<text:p><text:span text:style-name="T11">static text</text:span></text:p></office:text>'
    );
    const abs = writeFile('test-p9-duplicate-span.odt', buildStoredOdt(xml));
    mockTemplates.set('p9-duplicate-span', makeTemplate({
      id: 'p9-duplicate-span',
      templateStatus: 'READY_FOR_MERGE',
      p9Status: 'P9_READY',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: false },
        { key: 'partyName', label: '當事人', type: 'text', required: false },
        { key: 'facts', label: '事實', type: 'textarea', required: false },
      ],
    }));

    const result = renderTemplate('p9-duplicate-span', { caseNumber: 'A', partyName: 'B', facts: 'C' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
    expect(result.missingFields).toContain('caseNumber:duplicate-span');
  });

/* ---------- renderTemplate: MISSING_REQUIRED_FIELDS ---------- */
describe('renderTemplate — missing required fields', () => {
  it('returns MISSING_REQUIRED_FIELDS when required field value is empty', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const rel = 'test-missing.odt';
    const abs = writeFile(rel, odtBuf);

    mockTemplates.set('t6', makeTemplate({
      id: 't6',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    // Provide caseNumber but leave defendantName and defenseFacts empty
    const r = renderTemplate('t6', { caseNumber: '113訴1' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('MISSING_REQUIRED_FIELDS');
    expect(r.missingFields).toContain('defendantName');
    expect(r.missingFields).toContain('defenseFacts');
  });

  it('returns MISSING_REQUIRED_FIELDS when generic field values are empty', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-missing2.odt', odtBuf);

    mockTemplates.set('t7', makeTemplate({
      id: 't7',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    // Provide generic fallbacks for only some fields
    const r = renderTemplate('t7', { field_0: '113訴1', field_1: '', field_2: '' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('MISSING_REQUIRED_FIELDS');
  });
});

/* ---------- renderTemplate: success (stored ODT) ---------- */
describe('renderTemplate — success path (stored ODT)', () => {
  it('renders ODT and returns base64 document', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-render-stored.odt', odtBuf);

    mockTemplates.set('t8', makeTemplate({
      id: 't8',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t8', {
      caseNumber: '113年度訴字第456號',
      defendantName: '王小明',
      defenseFacts: '本人無罪之答辯要旨如下',
    });

    expect(r.success).toBe(true);
    expect(r.documentBase64).toBeDefined();
    expect(r.fileName).toMatch(/^t8-\d+-[0-9a-f-]+\.odt$/);
    expect(r.mimeType).toBe('application/vnd.oasis.opendocument.text');

    // Verify output is valid ZIP with replaced content
    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    expect(outBuf[0]).toBe(0x50);
    expect(outBuf[1]).toBe(0x4B);

    // Extract output content.xml and verify field replacement
    let foundXml = false;
    let off = 0;
    while (off < outBuf.length - 4) {
      if (outBuf[off] === 0x50 && outBuf[off + 1] === 0x4B) {
        const fnLen = outBuf.readUInt16LE(off + 26);
        const extraLen = outBuf.readUInt16LE(off + 28);
        const compSize = outBuf.readUInt32LE(off + 18);
        const fn = outBuf.slice(off + 30, off + 30 + fnLen).toString('utf-8');
        if (fn === 'content.xml') {
          foundXml = true;
          const dataOff = off + 30 + fnLen + extraLen;
          const data = outBuf.slice(dataOff, dataOff + compSize).toString('utf-8');
          // Old empty spans replaced with new values
          expect(data).toContain('113年度訴字第456號');
          expect(data).toContain('王小明');
          expect(data).toContain('本人無罪之答辯要旨如下');
          // Span tags remain, only content is replaced
          expect(data).toContain('text:style-name="T11"');
          break;
        }
        off += 30 + fnLen + extraLen + compSize;
      } else {
        break;
      }
    }
    expect(foundXml).toBe(true);
  });
});

/* ---------- renderTemplate: success (deflated ODT) ---------- */
describe('renderTemplate — success path (deflated ODT)', () => {
  it('renders deflated ODT and returns base64 document', () => {
    const xml = contentXml();
    const odtBuf = buildDeflatedOdt(xml);
    const abs = writeFile('test-render-deflated.odt', odtBuf);

    mockTemplates.set('t9', makeTemplate({
      id: 't9',
      templateStatus: 'DOWNLOADED',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t9', {
      caseNumber: '114年少訴1',
      defendantName: '李小華',
      defenseFacts: '少年事件答辯',
    });

    expect(r.success).toBe(true);
    expect(r.documentBase64).toBeDefined();
    expect(r.fileName).toMatch(/^t9-\d+-[0-9a-f-]+\.odt$/);

    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    expect(outBuf[0]).toBe(0x50);
    expect(outBuf[1]).toBe(0x4B);
  });

  it('uses unique artifact names for concurrent renders', async () => {
    const abs = writeFile('test-render-concurrent.odt', buildTwoEntryOdt(contentXml()));
    mockTemplates.set('concurrent', makeTemplate({
      id: 'concurrent', templateStatus: 'READY_FOR_MERGE', localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => Promise.resolve(renderTemplate('concurrent', {
      caseNumber: `113年度訴字第${index}號`, defendantName: `被告${index}`, defenseFacts: `答辯${index}`,
    }))));
    const names = results.map(result => result.fileName);
    expect(results.every(result => result.success)).toBe(true);
    expect(new Set(names).size).toBe(results.length);
  });
});

/* ---------- renderTemplate: two-entry ODT ---------- */
describe('renderTemplate — two-entry ODT (mimetype + content.xml)', () => {
  it('renders ODT with multiple ZIP entries', () => {
    const xml = contentXml({ t11: 'old1', t12: 'old2', t17: 'old3' });
    const odtBuf = buildTwoEntryOdt(xml);
    const abs = writeFile('test-render-multi.odt', odtBuf);

    mockTemplates.set('t10', makeTemplate({
      id: 't10',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t10', {
      caseNumber: '113上易789',
      defendantName: '張三丰',
      defenseFacts: '上訴理由狀',
    });

    expect(r.success).toBe(true);
    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    // Verify mimetype entry still present
    expect(outBuf.toString('utf-8')).toContain('application/vnd.oasis.opendocument.text');
  });
});

/* ---------- renderTemplate: XML escaping ---------- */
describe('renderTemplate — XML escaping', () => {
  it('escapes <, >, &, ", \' in field values', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-escape.odt', odtBuf);

    mockTemplates.set('t11', makeTemplate({
      id: 't11',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t11', {
      caseNumber: '<script>alert("xss")</script>',
      defendantName: "O'Brien & Co.",
      defenseFacts: 'A < B > C "D" E',
    });

    expect(r.success).toBe(true);
    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    const outStr = outBuf.toString('utf-8');
    // The escaped form should be in the output
    expect(outStr).toContain('&lt;script&gt;');
    expect(outStr).toContain('&amp;');
    expect(outStr).toContain('&apos;');
    expect(outStr).toContain('&quot;');
    // Raw unsafe chars should not appear unescaped in tag context
  });
});

/* ---------- renderTemplate: generic fallback fields ---------- */
describe('renderTemplate — generic field fallback', () => {
  it('uses field_0/field_1/field_2 as fallback when semantic keys missing', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-fallback.odt', odtBuf);

    mockTemplates.set('t12', makeTemplate({
      id: 't12',
      templateStatus: 'DOWNLOADED',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t12', {
      field_0: 'fallback-case',
      field_1: 'fallback-name',
      field_2: 'fallback-facts',
    });

    expect(r.success).toBe(true);
    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    const outStr = outBuf.toString('utf-8');
    expect(outStr).toContain('fallback-case');
    expect(outStr).toContain('fallback-name');
    expect(outStr).toContain('fallback-facts');
  });
});

/* ---------- renderTemplate: optional fields (no missing required) ---------- */
describe('renderTemplate — optional fields', () => {
  it('succeeds when optional fields are not provided', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-optional.odt', odtBuf);

    mockTemplates.set('t13', makeTemplate({
      id: 't13',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: false },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: false },
      ],
    }));

    const r = renderTemplate('t13', { caseNumber: 'required-value' });
    expect(r.success).toBe(true);
  });
});

/* ---------- renderTemplate: content.xml missing ---------- */
describe('renderTemplate — content.xml missing from ODT', () => {
  it('returns TEMPLATE_PARSE_ERROR when content.xml not in ZIP', () => {
    const odtBuf = buildNoContentXmlOdt();
    const abs = writeFile('test-no-content.odt', odtBuf);

    mockTemplates.set('t14', makeTemplate({
      id: 't14',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
      ],
    }));

    const r = renderTemplate('t14', { caseNumber: 'X' });
    expect(r.success).toBe(false);
    expect(r.code).toBe('TEMPLATE_PARSE_ERROR');
  });
});

/* ---------- extractTemplateFields ---------- */
describe('extractTemplateFields', () => {
  it('returns empty array when localFilePath is null', () => {
    const t = makeTemplate({ id: 'etf1', localFilePath: null, fields: [] });
    expect(extractTemplateFields(t)).toEqual([]);
  });

  it('returns empty array when file does not exist', () => {
    const t = makeTemplate({ id: 'etf2', localFilePath: 'nonexistent-file.odt', fields: [] });
    expect(extractTemplateFields(t)).toEqual([]);
  });

  it('returns empty array when content.xml missing from ODT', () => {
    const odtBuf = buildNoContentXmlOdt();
    const abs = writeFile('test-etf-no-content.odt', odtBuf);
    const t = makeTemplate({
      id: 'etf3',
      localFilePath: abs,
      fields: [{ key: 'caseNumber', label: '案號', type: 'text', required: true }],
    });
    expect(extractTemplateFields(t)).toEqual([]);
  });

  it('returns fields with hasSpan info', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-etf-with-xml.odt', odtBuf);
    const t = makeTemplate({
      id: 'etf4',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    });
    const fields = extractTemplateFields(t);
    expect(fields.length).toBe(3);
    expect(fields[0].key).toBe('caseNumber');
    expect(fields[1].key).toBe('defendantName');
    expect(fields[2].key).toBe('defenseFacts');
  });

  it('deduplicates fields by key', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-etf-dup.odt', odtBuf);
    const t = makeTemplate({
      id: 'etf5',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'caseNumber', label: '案號2', type: 'text', required: false },
      ],
    });
    const fields = extractTemplateFields(t);
    expect(fields.length).toBe(1);
  });

  it('returns empty fields array when template has no fields', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-etf-empty.odt', odtBuf);
    const t = makeTemplate({ id: 'etf6', localFilePath: abs, fields: [] });
    const fields = extractTemplateFields(t);
    expect(fields).toEqual([]);
  });
});

/* ---------- renderTemplate: no fields at all ---------- */
describe('renderTemplate — no fields in manifest', () => {
  it('renders successfully with no required fields', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-nofields.odt', odtBuf);

    mockTemplates.set('t15', makeTemplate({
      id: 't15',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [],
    }));

    const r = renderTemplate('t15', {});
    expect(r.success).toBe(true);
  });
});

/* ---------- renderTemplate: whitespace-only values treated as missing ---------- */
describe('renderTemplate — whitespace-only values treated as missing', () => {
  it('treats whitespace-only as missing for required field', () => {
    const xml = contentXml();
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-whitespace.odt', odtBuf);

    mockTemplates.set('t16', makeTemplate({
      id: 't16',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t16', {
      caseNumber: '   ',
      defendantName: '\t',
      defenseFacts: '',
    });
    expect(r.success).toBe(false);
    expect(r.code).toBe('MISSING_REQUIRED_FIELDS');
    expect(r.missingFields).toContain('caseNumber');
    expect(r.missingFields).toContain('defendantName');
    expect(r.missingFields).toContain('defenseFacts');
  });
});

/* ---------- renderTemplate: field with <text:s/> (space) spans ---------- */
describe('renderTemplate — content.xml with <text:s/> space elements', () => {
  it('replaces spans that contain <text:s/> elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:text xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
             xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <text:p><text:span text:style-name="T11">old<text:s/>value</text:span></text:p>
  <text:p><text:span text:style-name="T12">other</text:span></text:p>
  <text:p><text:span text:style-name="T17">third</text:span></text:p>
</office:text>`;
    const odtBuf = buildStoredOdt(xml);
    const abs = writeFile('test-spaces.odt', odtBuf);

    mockTemplates.set('t17', makeTemplate({
      id: 't17',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      ],
    }));

    const r = renderTemplate('t17', {
      caseNumber: 'NEW',
      defendantName: 'NAME',
      defenseFacts: 'FACTS',
    });
    expect(r.success).toBe(true);
    const outBuf = Buffer.from(r.documentBase64!, 'base64');
    const outStr = outBuf.toString('utf-8');
    expect(outStr).toContain('NEW');
    expect(outStr).toContain('NAME');
    expect(outStr).toContain('FACTS');
  });
});

describe('renderTemplate — official field binding and retention', () => {
  it('rejects fields that are not declared by the official template', () => {
    const abs = writeFile('test-unknown-field.odt', buildStoredOdt(contentXml()));
    mockTemplates.set('unknown-field', makeTemplate({
      id: 'unknown-field',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true }
      ]
    }));

    const result = renderTemplate('unknown-field', {
      caseNumber: '113訴1',
      defendantName: '王小明',
      defenseFacts: '答辯內容',
      unapprovedPrompt: '不得進入官方 ODT'
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_FIELD_NOT_ALLOWED');
    expect(result.missingFields).toContain('unapprovedPrompt');
  });

  it('returns the ODT bytes without writing a rendered file to the output directory', () => {
    const abs = writeFile('test-memory-only.odt', buildStoredOdt(contentXml()));
    mockTemplates.set('memory-only', makeTemplate({
      id: 'memory-only',
      templateStatus: 'READY_FOR_MERGE',
      localFilePath: abs,
      fields: [
        { key: 'caseNumber', label: '案號', type: 'text', required: true },
        { key: 'defendantName', label: '被告', type: 'text', required: true },
        { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true }
      ]
    }));
    const outputDir = path.resolve(process.cwd(), 'data', 'official-templates', 'output');
    const before = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).filter(name => name.startsWith('memory-only-')) : [];

    const result = renderTemplate('memory-only', {
      caseNumber: '113訴1',
      defendantName: '王小明',
      defenseFacts: '答辯內容'
    });
    const after = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).filter(name => name.startsWith('memory-only-')) : [];

    expect(result.success).toBe(true);
    expect(Buffer.from(result.documentBase64!, 'base64').subarray(0, 2).toString()).toBe('PK');
    expect(after).toEqual(before);
  });
});
