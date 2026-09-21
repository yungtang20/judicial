import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSignedToken } from '../middleware/auth';

const actualTemplate = {
  id: 'judicial-0202-1',
  code: '0202',
  name: '答辯狀',
  category: '刑事',
  sourcePageUrl: 'https://www.judicial.gov.tw/example',
  editableFileUrl: 'https://www.judicial.gov.tw/editable',
  pdfFileUrl: 'https://www.judicial.gov.tw/pdf',
  officialUpdatedAt: '110-12-23',
  localFilePath: 'data/official-templates/files/judicial-0202-1.odt',
  localFileHash: 'c7978050ee139dc1df6e3ffac932ee393d8f48e9fc4ac9163885678f670e2d5e',
  templateStatus: 'READY_FOR_MERGE' as const,
  p9Status: 'P9_READY' as const,
  p9ProfileId: 'OFFICIAL_CRIMINAL_ANSWER_PILOT_RULE_PROFILE',
  p9ProfileVersion: '1.0.0',
  fields: [{ key: 'caseNumber', label: '案號', type: 'text' as const, required: true }],
  downloadedAt: '2026-09-21T00:00:00.000Z'
};

const { getTemplateById, renderTemplate, executePipeline } = vi.hoisted(() => ({
  getTemplateById: vi.fn(),
  renderTemplate: vi.fn(),
  executePipeline: vi.fn()
}));

vi.mock('../../src/lib/officialTemplateManifest', () => ({
  getTemplateById,
  loadManifest: vi.fn(),
  getTemplatesByCategory: vi.fn(),
  getAllCategories: vi.fn()
}));
vi.mock('../../src/lib/officialTemplateRenderer', () => ({
  extractTemplateFields: vi.fn(() => actualTemplate.fields),
  renderTemplate
}));
vi.mock('../services/officialTemplatePleadingPipeline', () => ({
  executeOfficialTemplatePleadingPipeline: executePipeline,
  OfficialTemplatePleadingPipelineError: class extends Error {}
}));

import officialTemplatesRouter from './officialTemplates';

const artifact = fs.readFileSync(actualTemplate.localFilePath);
const app = express();
app.use(express.json());
app.use(officialTemplatesRouter);

describe('P9_READY official template route', () => {
  beforeEach(() => {
    process.env.REQUIRE_AUTH = 'false';
    getTemplateById.mockReturnValue(actualTemplate);
    renderTemplate.mockReturnValue({
      success: true,
      documentBase64: artifact.toString('base64'),
      fileName: 'judicial-0202-1-rendered.odt',
      mimeType: 'application/vnd.oasis.opendocument.text'
    });
    executePipeline.mockResolvedValue({
      documentText: 'normalized text',
      artifactHash: 'a'.repeat(64),
      deliveryAuthorization: {
        finalGateStatus: 'READY',
        exportPolicy: 'READY_ONLY',
        templateId: actualTemplate.id,
        templateSourceHash: actualTemplate.localFileHash,
        artifactFingerprint: 'a'.repeat(64),
        artifactMimeType: 'application/vnd.oasis.opendocument.text',
        artifactFileName: 'judicial-0202-1-rendered.odt'
      }
    });
  });

  it('returns an ODT result only after the P9 pipeline authorizes it', async () => {
    const response = await request(app)
      .post('/api/official-templates/judicial-0202-1/render')
      .set('Authorization', `Bearer ${createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' })}`)
      .send({ fields: { caseNumber: '113年度訴字第123號' } });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      p9Status: 'P9_READY',
      mimeType: 'application/vnd.oasis.opendocument.text',
      authorization: { exportPolicy: 'READY_ONLY', templateId: actualTemplate.id }
    });
    expect(Buffer.from(response.body.documentBase64, 'base64')).toEqual(artifact);
    expect(executePipeline).toHaveBeenCalledWith(expect.objectContaining({ sourceArtifact: artifact }));
  });

  it('returns a clear 422 for renderer field errors after P9_READY is established', async () => {
    renderTemplate.mockReturnValue({ success: false, code: 'MISSING_REQUIRED_FIELDS', error: 'Missing required fields', missingFields: ['caseNumber'] });
    const response = await request(app)
      .post('/api/official-templates/judicial-0202-1/render')
      .set('Authorization', `Bearer ${createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' })}`)
      .send({ fields: {} });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'MISSING_REQUIRED_FIELDS', missingFields: ['caseNumber'] });
  });

  it('does not expose a rendered artifact retrieval endpoint to another user', async () => {
    const response = await request(app)
      .get('/api/official-templates/judicial-0202-1/rendered.odt')
      .set('Authorization', `Bearer ${createSignedToken({ sub: 'other-user', tenantId: 'other-tenant', role: 'client' })}`);

    expect(response.status).toBe(404);
  });
});
