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
import { assertGeneratedDocumentVerified, verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline';
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
        : result.code === 'TEMPLATE_NOT_RENDERABLE' ? 422
        : 500;
      return res.status(status).json({
        error: result.error,
        code: result.code,
        missingFields: result.missingFields,
      });
    }

    try {
      assertGeneratedDocumentVerified(verifyGeneratedDocument(result.documentText || ''));
    } catch (error: any) {
      return res.status(422).json({
        error: error?.message || 'Generated document verification failed',
        code: 'DOCUMENT_VERIFICATION_FAILED',
      });
    }

    // This route has no trusted CaseInput/P8/P9 report yet. Client-provided
    // approval data must never authorize delivery of a court pleading.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(409).json({
      error: '法院書狀尚未取得 P9 Final Gate 的 READY 授權，禁止回傳或下載。',
      code: 'P9_FINAL_GATE_REQUIRED',
    });
  } catch {
    res.status(500).json({ error: 'Unable to render official template', code: 'TEMPLATE_RENDER_ERROR' });
  }
});

export default router;
