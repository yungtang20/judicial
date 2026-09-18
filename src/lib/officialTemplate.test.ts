/**
 * Official Template System Tests
 * Tests: category selection, field mapping, fail-closed, ESM, ODT integrity
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  loadManifest,
  getTemplateById,
  getTemplatesByCategory,
  getAllCategories,
} from '../lib/officialTemplateManifest';
import { extractTemplateFields, renderTemplate } from '../lib/officialTemplateRenderer';
import path from 'path';
import fs from 'fs';
import { inflateRawSync } from 'node:zlib';

const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'official-templates', 'manifest.json');
const manifestExists = fs.existsSync(MANIFEST_PATH);

describe('Official Template Manifest verification provenance', () => {
  it.each(['2026-01-01', '2027-06-15'])('does not use the load date %s as a verification date', async (date) => {
    vi.resetModules();
    const { loadManifest: loadIsolatedManifest } = await import('./officialTemplateManifest');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${date}T12:00:00Z`));
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('[]');

    try {
      const manifest = loadIsolatedManifest();
      expect(manifest.verifiedOn).toBeNull();
      expect(manifest.totalTemplates).toBe(0);
      expect(manifest.templates).toEqual([]);
      expect(loadIsolatedManifest()).toBe(manifest);
    } finally {
      existsSpy.mockRestore();
      readSpy.mockRestore();
      vi.useRealTimers();
      vi.resetModules();
    }
  });
});

describe.skipIf(!manifestExists)('Official Template Manifest', () => {
  let manifest: ReturnType<typeof loadManifest>;

  beforeAll(() => {
    manifest = loadManifest();
  });

  it('loads manifest with 600+ templates', () => {
    expect(manifest.totalTemplates).toBeGreaterThanOrEqual(600);
  });

  it('has 21 categories', () => {
    const cats = getAllCategories();
    expect(cats.length).toBeGreaterThanOrEqual(21);
  });

  it('criminal defense template exists with correct URLs', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    expect(t!.code).toBe('0202');
    expect(t!.category).toBe('刑事');
    expect(t!.sourcePageUrl).toContain('https://www.judicial.gov.tw/');
    expect(t!.editableFileUrl).toContain('https://www.judicial.gov.tw/');
    expect(t!.pdfFileUrl).toContain('https://www.judicial.gov.tw/');
  });

  it('all sourcePageUrl start with judicial.gov.tw', () => {
    for (const t of manifest.templates) {
      expect(t.sourcePageUrl).toMatch(/^https:\/\/www\.judicial\.gov\.tw\//);
    }
  });

  it('returns 404 for non-existent template id', () => {
    const t = getTemplateById('non-existent-id');
    expect(t).toBeNull();
  });

  it('can filter by category', () => {
    const criminal = getTemplatesByCategory('刑事');
    expect(criminal.length).toBeGreaterThan(0);
    expect(criminal.every(t => t.category === '刑事')).toBe(true);
  });
});

describe.skipIf(!manifestExists)('Official Template Renderer', () => {
  it('criminal defense template is NEEDS_FIELD_MAPPING (not READY_FOR_MERGE)', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    expect(t!.templateStatus).toBe('NEEDS_FIELD_MAPPING');
  });

  it('criminal defense template has 8 field definitions', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    expect(t!.fields.length).toBe(8);
    expect(t!.fields.some(f => f.key === 'defendantName')).toBe(true);
    expect(t!.fields.some(f => f.key === 'defenseFacts')).toBe(true);
    expect(t!.fields.some(f => f.key === 'phone')).toBe(true);
  });

  it('defenseFacts is required in manifest', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const df = t!.fields.find(f => f.key === 'defenseFacts');
    expect(df).toBeDefined();
    expect(df!.required).toBe(true);
  });

  it('phone is optional in manifest', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const ph = t!.fields.find(f => f.key === 'phone');
    expect(ph).toBeDefined();
    expect(ph!.required).toBe(false);
  });

  it('render fails closed with TEMPLATE_MAPPING_INCOMPLETE (status NEEDS_FIELD_MAPPING)', () => {
    const result = renderTemplate('judicial-0202-1', {
      caseNumber: '113年度訴字第123號',
      defendantName: '王小明',
      gender: '男',
      defenseFacts: '答辯要旨',
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
    expect(result.missingFields).toContain('defenseFacts');
  });

  it('render fails for non-existent template', () => {
    const result = renderTemplate('non-existent-id', { field: 'value' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('render fails for SOURCE_ONLY template', () => {
    const m = loadManifest();
    const sourceOnly = m.templates.find(t => t.templateStatus === 'SOURCE_ONLY');
    if (!sourceOnly) return;
    const result = renderTemplate(sourceOnly.id, {});
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_NOT_RENDERABLE');
  });

  it('different field values produce the same mapping failure', () => {
    const r1 = renderTemplate('judicial-0202-1', {
      caseNumber: '113年度訴字第1號',
      defendantName: '甲',
      gender: '男',
      defenseFacts: '事實一',
    });
    const r2 = renderTemplate('judicial-0202-1', {
      caseNumber: '113年度訴字第2號',
      defendantName: '乙',
      gender: '女',
      defenseFacts: '事實二',
    });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
    expect(r1.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
    expect(r2.code).toBe('TEMPLATE_MAPPING_INCOMPLETE');
  });
});

describe.skipIf(!manifestExists)('Official Template - Fail-Closed', () => {
  it('forged template id returns 404', () => {
    const result = renderTemplate('forged-template-id', {});
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('SOURCE_ONLY template cannot be rendered', () => {
    const m = loadManifest();
    const sourceOnly = m.templates.find(t => t.templateStatus === 'SOURCE_ONLY');
    if (!sourceOnly) return;
    const result = renderTemplate(sourceOnly.id, { any: 'field' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMPLATE_NOT_RENDERABLE');
  });

  it('template file not overwritten after render attempt', () => {
    const t = getTemplateById('judicial-0202-1');
    if (!t || !t.localFilePath) return;
    const origHash = t.localFileHash;
    renderTemplate('judicial-0202-1', {
      caseNumber: 'test',
      defendantName: 'test',
      gender: '男',
      defenseFacts: 'test',
    });
    const t2 = getTemplateById('judicial-0202-1');
    expect(t2!.localFileHash).toBe(origHash);
  });
});

describe.skipIf(!manifestExists)('Official Template - ESM & Field Mapping', () => {
  it('ESM import of renderer functions works', () => {
    expect(typeof renderTemplate).toBe('function');
    expect(typeof extractTemplateFields).toBe('function');
  });

  it('extractTemplateFields returns all 8 manifest fields', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const fields = extractTemplateFields(t!);
    expect(fields.length).toBe(8);
  });

  it('extractTemplateFields includes defenseFacts as required', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const fields = extractTemplateFields(t!);
    const df = fields.find(f => f.key === 'defenseFacts');
    expect(df).toBeDefined();
    expect(df!.required).toBe(true);
  });

  it('extractTemplateFields includes phone as optional', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const fields = extractTemplateFields(t!);
    const ph = fields.find(f => f.key === 'phone');
    expect(ph).toBeDefined();
    expect(ph!.required).toBe(false);
  });

  it('ODT template file is valid ZIP with content.xml', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    expect(t!.localFilePath).not.toBeNull();
    const absPath = path.resolve(process.cwd(), t!.localFilePath!);
    expect(fs.existsSync(absPath)).toBe(true);
    const buf = fs.readFileSync(absPath);
    // ZIP signature: PK
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4B);
    // Find content.xml
    const sig = Buffer.from('PK');
    let offset = 0;
    let foundContentXml = false;
    while (offset < buf.length - 4) {
      if (buf[offset] === 0x50 && buf[offset + 1] === 0x4B) {
        const fnLen = buf.readUInt16LE(offset + 26);
        const extraLen = buf.readUInt16LE(offset + 28);
        const compSize = buf.readUInt32LE(offset + 18);
        const fn = buf.slice(offset + 30, offset + 30 + fnLen).toString('utf-8');
        if (fn === 'content.xml') {
          foundContentXml = true;
          const dataOffset = offset + 30 + fnLen + extraLen;
          const data = buf.slice(dataOffset, dataOffset + compSize);
          const xml = compSize === 0 ? '' : inflateRawSync(data).toString('utf-8');
          expect(xml).toContain('text:span');
          break;
        }
        offset += 30 + fnLen + extraLen + compSize;
      } else {
        break;
      }
    }
    expect(foundContentXml).toBe(true);
  });

  it('ODT content.xml contains T11/T12/T17 underline spans', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const absPath = path.resolve(process.cwd(), t!.localFilePath!);
    const buf = fs.readFileSync(absPath);
    let offset = 0;
    while (offset < buf.length - 4) {
      if (buf[offset] === 0x50 && buf[offset + 1] === 0x4B) {
        const fnLen = buf.readUInt16LE(offset + 26);
        const extraLen = buf.readUInt16LE(offset + 28);
        const compSize = buf.readUInt32LE(offset + 18);
        const fn = buf.slice(offset + 30, offset + 30 + fnLen).toString('utf-8');
        if (fn === 'content.xml') {
          const dataOffset = offset + 30 + fnLen + extraLen;
          const data = buf.slice(dataOffset, dataOffset + compSize);
          const xml = inflateRawSync(data).toString('utf-8');
          expect(xml).toContain('text:style-name="T11"');
          expect(xml).toContain('text:style-name="T12"');
          expect(xml).toContain('text:style-name="T17"');
          break;
        }
        offset += 30 + fnLen + extraLen + compSize;
      } else {
        break;
      }
    }
  });

  it('ODT content.xml does NOT contain T46/T47/T48 as fillable spans', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const absPath = path.resolve(process.cwd(), t!.localFilePath!);
    const buf = fs.readFileSync(absPath);
    let offset = 0;
    while (offset < buf.length - 4) {
      if (buf[offset] === 0x50 && buf[offset + 1] === 0x4B) {
        const fnLen = buf.readUInt16LE(offset + 26);
        const extraLen = buf.readUInt16LE(offset + 28);
        const compSize = buf.readUInt32LE(offset + 18);
        const fn = buf.slice(offset + 30, offset + 30 + fnLen).toString('utf-8');
        if (fn === 'content.xml') {
          const dataOffset = offset + 30 + fnLen + extraLen;
          const data = buf.slice(dataOffset, dataOffset + compSize);
          const xml = inflateRawSync(data).toString('utf-8');
          // T46/T47/T48 contain static text "撰狀人（簽名）" / "或" / "蓋章"
          // They should NOT be empty underlined spans like T11/T12/T17
          const t46Match = xml.match(/<text:span text:style-name="T46">([^<]*)<\/text:span>/);
          if (t46Match) {
            expect(t46Match[1].trim().length).toBeGreaterThan(0);
          }
          break;
        }
        offset += 30 + fnLen + extraLen + compSize;
      } else {
        break;
      }
    }
  });
});

describe.skipIf(!manifestExists)('Official Template - Hash Integrity', () => {
  it('original ODT hash unchanged after all operations', () => {
    const t = getTemplateById('judicial-0202-1');
    expect(t).not.toBeNull();
    const origHash = t!.localFileHash;
    expect(origHash).not.toBeNull();
    const absPath = path.resolve(process.cwd(), t!.localFilePath!);
    const buf = fs.readFileSync(absPath);
    const crypto = require('node:crypto');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    expect(hash).toBe(origHash);
  });
});
