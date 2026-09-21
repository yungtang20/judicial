import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTemplateById } from '../../src/lib/officialTemplateManifest.js';
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

describe('officialTemplatePleadingPipeline', () => {
  it('blocks required field omission before Reviewer or Re-review', async () => {
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values: { ...values, signature: undefined },
      artifact
    })).rejects.toMatchObject({ code: 'REQUIRED_FIELD_MISSING' });
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
    const result = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact });
    expect(result.officialTemplateFormatFinding).toMatchObject({
      templateId: 'judicial-0202-1',
      sourceHash: artifactHash,
      artifactHash,
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
      artifactFingerprint: artifactHash,
      artifactMimeType: 'application/vnd.oasis.opendocument.text',
      artifactFileName: 'judicial-0202-1.odt'
    });
  });

  it('rejects fingerprint drift in an old Reviewer report and never reuses its authorization', async () => {
    const first = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact });
    const drifted = { ...first.draft, sections: first.draft.sections.map(section => ({ ...section, content: `${section.content} tampered` })) };
    await expect(executeOfficialTemplatePleadingPipeline({
      template: template(),
      values,
      artifact,
      previous: {
        draft: drifted,
        reviewReport: first.reviewReport,
        authorization: { draftId: first.draft.id } as never,
        fieldValuesFingerprint: await fingerprintReviewPayload(values)
      }
    })).rejects.toMatchObject({ code: 'REVIEW_FINGERPRINT_DRIFT' });
  });

  it('blocks replay of READY_ONLY authorization to another template or ODT', async () => {
    const result = await executeOfficialTemplatePleadingPipeline({ template: template(), values, artifact });
    const authorization = result.deliveryAuthorization;
    const baseArtifact = {
      templateId: 'judicial-0202-1',
      templateSourceHash: artifactHash,
      buffer: artifact,
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
        buffer: Buffer.concat([artifact, Buffer.from('tampered')])
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
