import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  normalizeOdtText,
  verifyOfficialTemplateBuffer,
  verifyOfficialTemplateSource,
  verifyTemplateArtifactAndMapping,
  verifyTemplateFieldMapping,
} from './officialTemplateArtifactVerifier';
import { getTemplateById } from './officialTemplateManifest';
import type { OfficialTemplate } from '../types/officialTemplate';

function template(fields: OfficialTemplate['fields']): OfficialTemplate {
  return {
    id: 'test-template',
    category: '刑事',
    code: '0000',
    name: '測試範本',
    sourcePageUrl: 'https://www.judicial.gov.tw/test',
    editableFileUrl: null,
    pdfFileUrl: null,
    officialUpdatedAt: '114-01-01',
    localFilePath: null,
    localFileHash: null,
    templateStatus: 'READY_FOR_MERGE',
    p9Status: 'P9_NOT_CONFIGURED',
    fields,
    downloadedAt: null,
  };
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:text xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <text:p><text:span text:style-name="T11">案號</text:span></text:p>
  <text:p><text:span text:style-name="T12">被告 &amp; 代理人</text:span></text:p>
  <text:p><text:span text:style-name="T17">答辯<text:line-break/>內容</text:span></text:p>
</office:text>`;

describe('official template artifact verifier', () => {
  it('verifies the existing official source hash', () => {
    const official = getTemplateById('judicial-0202-1');
    expect(official).not.toBeNull();
    expect(verifyOfficialTemplateSource(official!)).toMatchObject({ status: 'VERIFIED' });
  });

  it('rejects a source hash mismatch', () => {
    const official = getTemplateById('judicial-0202-1');
    expect(official).not.toBeNull();
    const result = verifyOfficialTemplateSource({ ...official!, localFileHash: '0'.repeat(64) });
    expect(result.status).toBe('HASH_MISMATCH');
  });

  it('rejects an invalid ODT artifact', () => {
    const result = verifyOfficialTemplateBuffer(Buffer.from('not an odt'), '0'.repeat(64));
    expect(result.status).toBe('INVALID');
  });

  it('verifies mapping and reports required fields without ODT spans', () => {
    const result = verifyTemplateFieldMapping(template([
      { key: 'caseNumber', label: '案號', type: 'text', required: true },
      { key: 'defendantName', label: '被告', type: 'text', required: true },
      { key: 'defenseFacts', label: '答辯', type: 'textarea', required: true },
      { key: 'signature', label: '簽名', type: 'text', required: true },
    ]), xml);

    expect(result.status).toBe('MAPPING_INCOMPLETE');
    expect(result.missingRequiredFields).toEqual(['signature']);
  });

  it('normalizes ODT XML into legal document text instead of returning XML', () => {
    expect(normalizeOdtText(xml)).toBe('案號\n被告 & 代理人\n答辯\n內容');
  });

  it('binds source hash, mapping, and normalized text in one verification result', () => {
    const buffer = fs.readFileSync(getTemplateById('judicial-0202-1')!.localFilePath!);
    const official = getTemplateById('judicial-0202-1')!;
    const result = verifyTemplateArtifactAndMapping(official, buffer);

    expect(result.status).toBe('VERIFIED');
    expect(result.sha256).toBe(crypto.createHash('sha256').update(buffer).digest('hex'));
    expect(result.normalizedText).toBeTruthy();
    expect(result.mapping).toBeDefined();
  });
});
