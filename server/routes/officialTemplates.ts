/**
 * Official Template API Routes
 * GET /api/official-templates - list categories and templates
 * GET /api/official-templates/:id - get template details
 * POST /api/official-templates/:id/render - render a single template
 */
import { Router, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadManifest,
  getTemplateById,
  getTemplatesByCategory,
  getAllCategories,
} from '../../src/lib/officialTemplateManifest';
import { extractTemplateFields, renderTemplate } from '../../src/lib/officialTemplateRenderer';
import { executeOfficialTemplatePleadingPipeline, OfficialTemplatePleadingPipelineError } from '../services/officialTemplatePleadingPipeline';
import { requireAuth } from '../middleware/auth';

const router = Router();
const TEMPLATE_FILES_DIR = path.resolve(process.cwd(), 'data', 'official-templates', 'files');

/**
 * GET /api/official-templates
 * Returns categories with template counts, or templates filtered by category
 */
router.get('/api/official-templates', (req: Request, res: Response) => {
  try {
    const manifest = loadManifest();
    const category = req.query.category as string | undefined;

    if (category) {
      const templates = getTemplatesByCategory(category);
      return res.json({
        category,
        templates: templates.map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
          category: t.category,
          sourcePageUrl: t.sourcePageUrl,
          officialUpdatedAt: t.officialUpdatedAt,
          templateStatus: t.templateStatus,
          p9Status: t.p9Status,
          hasEditableFile: !!t.editableFileUrl,
          hasPdf: !!t.pdfFileUrl,
        })),
      });
    }

    // Return categories summary
    const categories = getAllCategories();
    const summary = categories.map(cat => {
      const templates = getTemplatesByCategory(cat);
      return {
        name: cat,
        total: templates.length,
        readyForMerge: templates.filter(t => t.templateStatus === 'READY_FOR_MERGE').length,
        needsFieldMapping: templates.filter(t => t.templateStatus === 'NEEDS_FIELD_MAPPING').length,
        downloaded: templates.filter(t => t.templateStatus === 'DOWNLOADED').length,
        sourceOnly: templates.filter(t => t.templateStatus === 'SOURCE_ONLY').length,
        sourceLinks: templates.filter(t => !!t.sourcePageUrl).length,
      };
    });

    res.json({
      verifiedOn: manifest.verifiedOn,
      totalTemplates: manifest.totalTemplates,
      categories: summary,
    });
  } catch {
    res.status(500).json({ error: 'Unable to load official template catalog', code: 'TEMPLATE_CATALOG_ERROR' });
  }
});

/**
 * GET /api/official-templates/:id
 * Returns full template details including field definitions
 */
router.get('/api/official-templates/:id', (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' });
    }

    const fields = extractTemplateFields(template);

    res.json({
      id: template.id,
      code: template.code,
      name: template.name,
      category: template.category,
      sourcePageUrl: template.sourcePageUrl,
      editableFileUrl: template.editableFileUrl,
      pdfFileUrl: template.pdfFileUrl,
      officialUpdatedAt: template.officialUpdatedAt,
      templateStatus: template.templateStatus,
      p9Status: template.p9Status,
      hasEditableFile: !!template.editableFileUrl,
      hasPdf: !!template.pdfFileUrl,
      localFileHash: template.localFileHash,
      downloadedAt: template.downloadedAt,
      fields,
    });
  } catch {
    res.status(500).json({ error: 'Unable to load official template details', code: 'TEMPLATE_CATALOG_ERROR' });
  }
});

/**
 * GET /api/official-templates/:id/source
 * Downloads the hash-verified official source file. This is the unchanged
 * Judicial Yuan artifact, not a generated or P9-approved pleading.
 */
router.get('/api/official-templates/:id/source', requireAuth(), (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' });
    }
    if (!template.localFilePath || !template.localFileHash) {
      return res.status(404).json({ error: 'Official source file is unavailable', code: 'TEMPLATE_SOURCE_UNAVAILABLE' });
    }

    const resolved = path.resolve(process.cwd(), template.localFilePath);
    const relative = path.relative(TEMPLATE_FILES_DIR, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Official source file is unavailable', code: 'TEMPLATE_SOURCE_UNAVAILABLE' });
    }

    const extension = path.extname(resolved).toLowerCase();
    const mimeType = extension === '.odt'
      ? 'application/vnd.oasis.opendocument.text'
      : extension === '.pdf'
        ? 'application/pdf'
        : null;
    if (!mimeType) {
      return res.status(422).json({ error: 'Unsupported official source format', code: 'TEMPLATE_SOURCE_FORMAT_INVALID' });
    }

    const source = fs.readFileSync(resolved);
    if (createHash('sha256').update(source).digest('hex') !== template.localFileHash) {
      return res.status(409).json({ error: 'Official source integrity verification failed', code: 'TEMPLATE_SOURCE_HASH_MISMATCH' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.id}${extension}"`);
    return res.send(source);
  } catch {
    return res.status(500).json({ error: 'Unable to download official source file', code: 'TEMPLATE_SOURCE_ERROR' });
  }
});

/**
 * POST /api/official-templates/:id/render
 * Renders a single template with user-provided fields
 * Must pass document verification before returning
 */
router.post('/api/official-templates/:id/render', requireAuth(), async (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' });
    }

    if (template.p9Status !== 'P9_READY') {
      return res.status(409).json({
        error: '官方範本尚未通過 P9 Final Gate，禁止產生或下載 ODT。',
        code: 'P9_FINAL_GATE_REQUIRED',
        p9Status: template.p9Status || 'P9_NOT_CONFIGURED',
      });
    }

    if (template.templateStatus === 'SOURCE_ONLY') {
      return res.status(422).json({
        error: 'This template is SOURCE_ONLY and cannot be rendered. Use the official link to download directly.',
        code: 'TEMPLATE_SOURCE_ONLY',
      });
    }

    if (template.templateStatus === 'OUTDATED') {
      return res.status(422).json({
        error: 'This template is outdated. Please check for a newer version.',
        code: 'TEMPLATE_OUTDATED',
      });
    }

    if (template.templateStatus === 'DOWNLOAD_FAILED') {
      return res.status(422).json({
        error: 'Template download previously failed.',
        code: 'TEMPLATE_DOWNLOAD_FAILED',
      });
    }

    const { fields } = req.body;
    if (!fields || typeof fields !== 'object') {
      return res.status(422).json({
        error: 'Request body must contain "fields" object',
        code: 'MISSING_FIELDS',
      });
    }

    const result = renderTemplate(req.params.id, fields);

    if (!result.success) {
      const status = result.code === 'TEMPLATE_NOT_FOUND' ? 404
        : result.code === 'MISSING_REQUIRED_FIELDS' ? 422
        : result.code === 'TEMPLATE_MAPPING_INCOMPLETE' ? 422
        : result.code === 'TEMPLATE_FIELD_NOT_ALLOWED' ? 422
        : result.code === 'TEMPLATE_NOT_RENDERABLE' ? 422
        : 500;
      return res.status(status).json({
        error: result.error,
        code: result.code,
        missingFields: result.missingFields,
      });
    }

    const resolved = path.resolve(process.cwd(), template.localFilePath || '');
    const relative = path.relative(TEMPLATE_FILES_DIR, resolved);
    if (!template.localFilePath || !template.localFileHash || !relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
      return res.status(422).json({ error: 'Official source file is unavailable', code: 'TEMPLATE_SOURCE_UNAVAILABLE' });
    }

    if (!result.documentBase64) {
      return res.status(422).json({ error: 'Rendered ODT artifact is unavailable', code: 'TEMPLATE_ARTIFACT_UNAVAILABLE' });
    }

    const pipeline = await executeOfficialTemplatePleadingPipeline({
      template,
      values: fields,
      artifact: Buffer.from(result.documentBase64, 'base64'),
      artifactFileName: result.fileName,
      sourceArtifact: fs.readFileSync(resolved),
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      templateId: template.id,
      p9Status: template.p9Status,
      documentBase64: result.documentBase64,
      documentText: pipeline.documentText,
      fileName: result.fileName,
      mimeType: result.mimeType,
      artifactFingerprint: pipeline.artifactHash,
      authorization: pipeline.deliveryAuthorization,
    });
  } catch (error: any) {
    if (error instanceof OfficialTemplatePleadingPipelineError) {
      const status = error.code === 'REQUIRED_FIELD_MISSING' || error.code === 'ARTIFACT_OR_MAPPING_BLOCKED'
        ? 422
        : 409;
      return res.status(status).json({ error: error.message, code: error.code, fields: error.fields });
    }
    res.status(500).json({ error: 'Unable to render official template', code: 'TEMPLATE_RENDER_ERROR' });
  }
});

export default router;
