/**
 * Official Template API Routes
 * GET /api/official-templates - list categories and templates
 * GET /api/official-templates/:id - get template details
 * POST /api/official-templates/:id/render - render a single template
 */
import { Router, Request, Response } from 'express';
import {
  loadManifest,
  getTemplateById,
  getTemplatesByCategory,
  getAllCategories,
} from '../../src/lib/officialTemplateManifest';
import { extractTemplateFields, renderTemplate } from '../../src/lib/officialTemplateRenderer';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline';
import { requireAuth } from '../middleware/auth';

const router = Router();

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
        sourceOnly: templates.filter(t => t.templateStatus === 'SOURCE_ONLY').length,
      };
    });

    res.json({
      verifiedOn: manifest.verifiedOn,
      totalTemplates: manifest.totalTemplates,
      categories: summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      localFileHash: template.localFileHash,
      downloadedAt: template.downloadedAt,
      fields,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    // Run document verification (existing pipeline)
    const verification = verifyGeneratedDocument(result.documentBase64 || '');

    res.json({
      success: true,
      documentBase64: result.documentBase64,
      fileName: result.fileName,
      mimeType: result.mimeType,
      verification,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
