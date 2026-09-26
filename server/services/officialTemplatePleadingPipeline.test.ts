import crypto from 'node:crypto';
import fs from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { getTemplateById } from '../../src/lib/officialTemplateManifest.js';
import { extractContentXml, renderTemplate } from '../../src/lib/officialTemplateRenderer.js';
import { fingerprintReviewPayload } from '../../src/lib/reviewer/pleadingReviewer.js';
import { verifyPleadingDeliveryAuthorization } from '../../src/lib/finalGate/pleadingExportGate.js';
import { executeOfficialTemplatePleadingPipeline, OfficialTemplatePleadingPipelineError } from './officialTemplatePleadingPipeline.js';

const official = getTemplateById('judicial-0202-1')!;
const artifact = fs.readFileSync(official.localFilePath!);
const artifactHash = crypto.createHash('sha256').update(artifact).digest('hex');

function template(overrides: Partial<typeof official> = {}) {
  return {
    ...official,
    templateStatus: 'READY_FOR_MERGE' as const,
    localFileHash: artifactHash,
    fields: [
      { ...official.fields[0], required: true },
      { ...official.fields[1], required: true },
      { ...official.fields[2], required: true },
      ...official.fields.slice(3).map(field => ({ ...field, required: false })),
      { key: 'documentDate', label: '日期', type: 'date' as const, required: false },
      { key: 'signature', label: '簽名', type: 'text' as const, required: false }
    ],
    ...overrides
  };
}

const values = {
  caseNumber: '113年度訴字第123號',
  defendantName: '王小明',
  gender: '男',
  currentAddress: '臺北市中正區測試路1號',
  defenseFacts: '本人就起訴內容提出答辯。',
  documentDate: '2026-09-21',
  signature: '王小明'
};

function buildRenderedArtifact(inputValues: Record<string, string | undefined>): Buffer {
  const manifestTemplate = getTemplateById(official.id)!;
  const originalTemplateStatus = manifestTemplate.templateStatus;
  const originalFields = manifestTemplate.fields;
  manifestTemplate.fields = manifestTemplate.fields.map((field, index) => ({ ...field, required: index < 3 }));
  manifestTemplate.templateStatus = 'READY_FOR_MERGE';
  try {
    const rendered = renderTemplate(official.id, Object.fromEntries(
      official.fields.map(field => [field.key, inputValues[field.key] || ''])
    ));
    if (!rendered.success || !rendered.documentBase64) {
      throw new Error(`無法建立測試用 rendered ODT: ${rendered.code || 'UNKNOWN'}`);
    }
    return Buffer.from(rendered.documentBase64, 'base64');
  } finally {
    manifestTemplate.fields = originalFields;
    manifestTemplate.templateStatus = originalTemplateStatus;
  }
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function replaceContentXml(odt: Buffer, transform: (contentXml: string) => string): Buffer {
  const entries: Array<{ name: string; data: Buffer }> = [];
  let offset = 0;
  while (offset < odt.length - 4) {
    if (odt.readUInt32LE(offset) !== 0x04034b50) break;
    const compressionMethod = odt.readUInt16LE(offset + 8);
    const compressedSize = odt.readUInt32LE(offset + 18);
    const fileNameLength = odt.readUInt16LE(offset + 26);
    const extraFieldLength = odt.readUInt16LE(offset + 28);
    const name = odt.subarray(offset + 30, offset + 30 + fileNameLength).toString('utf-8');
    const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
    const rawData = odt.subarray(dataOffset, dataOffset + compressedSize);
    const data = compressionMethod === 0
      ? Buffer.from(rawData)
      : inflateRawSync(rawData);
    entries.push({ name, data: name === 'content.xml' ? Buffer.from(transform(data.toString('utf-8'))) : data });
    offset = dataOffset + compressedSize;
  }

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf-8');
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(entry.data), 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, entry.data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(entry.data), 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length + entry.data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([Buffer.concat(localParts), central, end]);
}

function buildCrossSpanCitationArtifact(inputValues: Record<string, string | undefined>): Buffer {
  const rendered = buildRenderedArtifact(inputValues);
  const contentXml = extractContentXml(rendered);
  if (!contentXml) throw new Error('無法擷取測試 ODT content.xml');
  return replaceContentXml(rendered, xml => xml.replace(
    '行政訴訟法第999條',
    '<text:span>行政訴訟法第</text:span><text:span>999條</text:span>'
  ));
}

const renderedArtifact = buildRenderedArtifact(values);
const renderedArtifactHash = crypto.createHash('sha256').update(renderedArtifact).digest('hex');

describe('officialTemplatePleadingPipeline', () => {
  it('blocks required field omission before Reviewer or Re-review', async () => {
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values: { ...values, signature: undefined },
      artifact
    })).rejects.toMatchObject({ code: 'REQUIRED_FIELD_MISSING' });
  });

  it('blocks an artifact that omits mapped user values', async () => {
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values,
      artifact,
      sourceArtifact: artifact,
    })).rejects.toMatchObject({ code: 'ARTIFACT_CONTENT_MISMATCH' });
  });

  it('blocks ghost citations found in the actual rendered artifact', async () => {
    const ghostValues = { ...values, caseNumber: '行政訴訟法第999條' };
    const ghostArtifact = buildRenderedArtifact(ghostValues);
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values: ghostValues,
      artifact: ghostArtifact,
      sourceArtifact: artifact,
    })).rejects.toMatchObject({ code: 'ARTIFACT_CITATION_BLOCKED' });
  });

  it('blocks a citation split across ODT spans after whitespace normalization', async () => {
    const crossSpanValues = { ...values, caseNumber: '行政訴訟法第999條' };
    const crossSpanArtifact = buildCrossSpanCitationArtifact(crossSpanValues);
    expect(extractContentXml(crossSpanArtifact)).toContain('<text:span>行政訴訟法第</text:span><text:span>999條</text:span>');
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values: crossSpanValues,
      artifact: crossSpanArtifact,
      sourceArtifact: artifact,
    })).rejects.toMatchObject({ code: 'ARTIFACT_CITATION_BLOCKED' });
  });

  it('blocks source hash drift before canonical review', async () => {
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template({ localFileHash: '0'.repeat(64) }),
      values,
      artifact
    })).rejects.toMatchObject({ code: 'SOURCE_HASH_DRIFT' });
  });

  it('blocks artifact hash drift before P9 authorization', async () => {
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values,
      artifact: Buffer.concat([artifact, Buffer.from('artifact drift')])
    })).rejects.toMatchObject({ code: 'SOURCE_HASH_DRIFT' });
  });

  it('binds official metadata into both Reviewer and Independent Re-review', async () => {
    const result = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact: renderedArtifact, sourceArtifact: artifact });
    expect(result.officialTemplateFormatFinding).toMatchObject({
      templateId: 'judicial-0202-1',
      sourceHash: artifactHash,
      artifactHash: renderedArtifactHash,
      mappingVersion: '1.0.0'
    });
    expect(result.reviewReport.findings.find(item => item.id === 'P6.FORMAT.OFFICIAL_TEMPLATE')).toMatchObject({ status: 'COMPLIANT' });
    expect(result.independentReReviewReport.revisedReviewReport.findings.find(item => item.id === 'P6.FORMAT.OFFICIAL_TEMPLATE')).toMatchObject({ status: 'COMPLIANT' });
    expect(result.finalGateReport.status).toBe('READY');
    expect(result.deliveryAuthorization).toMatchObject({
      finalGateStatus: 'READY',
      exportPolicy: 'READY_ONLY',
      templateId: 'judicial-0202-1',
      templateSourceHash: artifactHash,
      artifactFingerprint: renderedArtifactHash,
      artifactMimeType: 'application/vnd.oasis.opendocument.text',
      artifactFileName: 'judicial-0202-1.odt'
    });
  });

  it('binds the rendered artifact file name to the P9 authorization', async () => {
    const result = await executeOfficialTemplatePleadingPipeline({
      template: template(),
      values,
      artifact: renderedArtifact,
      sourceArtifact: artifact,
      artifactFileName: 'judicial-0202-1-rendered.odt'
    });
    expect(result.deliveryAuthorization.artifactFileName).toBe('judicial-0202-1-rendered.odt');
  });

  it('rejects fingerprint drift in an old Reviewer report and never reuses its authorization', async () => {
    const first = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact: renderedArtifact, sourceArtifact: artifact });
    const drifted = { ...first.draft, sections: first.draft.sections.map(section => ({ ...section, content: `${section.content} tampered` })) };
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values,
      artifact: renderedArtifact,
      sourceArtifact: artifact,
      previous: {
        draft: drifted,
        reviewReport: first.reviewReport,
        authorization: { draftId: first.draft.id } as never,
        fieldValuesFingerprint: await fingerprintReviewPayload(values)
      }
    })).rejects.toMatchObject({ code: 'REVIEW_FINGERPRINT_DRIFT' });
  });

  it('blocks replay of READY_ONLY authorization to another template or ODT', async () => {
    const result = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact: renderedArtifact, sourceArtifact: artifact });
    const authorization = result.deliveryAuthorization;
    const baseArtifact = {
      templateId: 'judicial-0202-1',
      templateSourceHash: artifactHash,
      buffer: renderedArtifact,
      mimeType: 'application/vnd.oasis.opendocument.text',
      fileName: 'judicial-0202-1.odt',
      normalizedText: result.documentText
    };
    expect((await verifyPleadingDeliveryAuthorization(
      'JUDICIAL_CRIMINAL_TEMPLATE', authorization, 'DOWNLOAD_WORD', result.documentText, baseArtifact
    )).allowed).toBe(true);
    expect((await verifyPleadingDeliveryAuthorization(
      'JUDICIAL_CRIMINAL_TEMPLATE', authorization, 'DOWNLOAD_WORD', result.documentText, {
        ...baseArtifact,
        templateId: 'another-template'
      }
    )).allowed).toBe(false);
    expect((await verifyPleadingDeliveryAuthorization(
      'JUDICIAL_CRIMINAL_TEMPLATE', authorization, 'DOWNLOAD_WORD', result.documentText, {
        ...baseArtifact,
        buffer: Buffer.concat([renderedArtifact, Buffer.from('tampered')])
      }
    )).allowed).toBe(false);
    expect((await verifyPleadingDeliveryAuthorization(
      'JUDICIAL_CRIMINAL_TEMPLATE', authorization, 'DOWNLOAD_WORD', result.documentText, {
        ...baseArtifact,
        normalizedText: `${result.documentText} tampered`
      }
    )).allowed).toBe(false);
  });
});
