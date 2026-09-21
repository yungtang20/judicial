/**
 * Official Template Manifest Loader
 * Loads the scraped manifest from data/official-templates/manifest.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  OfficialTemplate,
  OfficialTemplateManifest,
  OfficialTemplateP9Status,
  TemplateStatus,
} from '../types/officialTemplate';

const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'official-templates', 'manifest.json');

let _cache: OfficialTemplateManifest | null = null;

function sha256File(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sourcePath(template: OfficialTemplate): string | null {
  if (!template.localFilePath) return null;
  const resolved = path.resolve(process.cwd(), template.localFilePath);
  const filesRoot = path.resolve(process.cwd(), 'data', 'official-templates', 'files');
  const relative = path.relative(filesRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

function normalizeTemplate(template: OfficialTemplate): OfficialTemplate {
  return {
    ...template,
    p9Status: template.p9Status || 'P9_NOT_CONFIGURED',
  };
}

/**
 * Downgrade a previously approved template whenever its immutable source
 * binding no longer matches the manifest or the file on disk.
 */
export function synchronizeP9Statuses(
  templates: OfficialTemplate[],
  readSourceHash: (template: OfficialTemplate) => string | null = template => {
    const filePath = sourcePath(template);
    return filePath ? sha256File(filePath) : null;
  }
): boolean {
  let changed = false;
  for (const template of templates) {
    if (template.p9Status !== 'P9_READY') continue;

    const actualHash = readSourceHash(template);
    const drifted = !template.localFileHash
      || !template.p9SourceHash
      || template.p9SourceHash !== template.localFileHash
      || !template.p9SourceOfficialUpdatedAt
      || template.p9SourceOfficialUpdatedAt !== template.officialUpdatedAt
      || actualHash !== template.localFileHash;

    if (drifted) {
      template.p9Status = 'P9_BLOCKED';
      changed = true;
    }
  }
  return changed;
}

export function loadManifest(): OfficialTemplateManifest {
  if (_cache) return _cache;

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}. Run the scraper first.`);
  }

  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as OfficialTemplate[];
  const templates = raw.map(normalizeTemplate);
  if (synchronizeP9Statuses(templates)) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(templates, null, 2));
  }
  _cache = {
    verifiedOn: null,
    totalTemplates: templates.length,
    templates,
  };
  return _cache;
}

export function getTemplateById(id: string): OfficialTemplate | null {
  const manifest = loadManifest();
  return manifest.templates.find(t => t.id === id) || null;
}

export function getTemplatesByCategory(category: string): OfficialTemplate[] {
  const manifest = loadManifest();
  return manifest.templates.filter(t => t.category === category);
}

export function getAllCategories(): string[] {
  const manifest = loadManifest();
  return [...new Set(manifest.templates.map(t => t.category))];
}

export function updateTemplateStatus(id: string, status: TemplateStatus, extra?: Partial<OfficialTemplate>): void {
  const manifest = loadManifest();
  const template = manifest.templates.find(t => t.id === id);
  if (!template) throw new Error(`Template ${id} not found`);
  template.templateStatus = status;
  Object.assign(template, extra);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest.templates, null, 2));
  _cache = null; // invalidate cache
}

export function updateTemplateP9Status(
  id: string,
  status: OfficialTemplateP9Status,
  extra?: Pick<OfficialTemplate, 'p9ProfileId' | 'p9ProfileVersion' | 'p9SourceHash' | 'p9VerifiedAt' | 'p9SourceOfficialUpdatedAt' | 'templateVersion'>
): void {
  const manifest = loadManifest();
  const template = manifest.templates.find(t => t.id === id);
  if (!template) throw new Error(`Template ${id} not found`);
  template.p9Status = status;
  Object.assign(template, extra);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest.templates, null, 2));
  _cache = null;
}

export function classifyTemplateP9Readiness(template: OfficialTemplate): {
  status: OfficialTemplateP9Status;
  reasons: string[];
} {
  if (template.p9Status === 'P9_READY') {
    return { status: 'P9_READY', reasons: [] };
  }

  const reasons: string[] = [];
  if (template.templateStatus !== 'READY_FOR_MERGE' && template.templateStatus !== 'DOWNLOADED') {
    reasons.push(`templateStatus=${template.templateStatus}`);
  }
  if (!template.localFilePath || !template.localFileHash) reasons.push('SOURCE_HASH_UNAVAILABLE');
  if (!template.fields.length) reasons.push('FIELD_MAPPING_NOT_CONFIGURED');
  if (!template.p9ProfileId || !template.p9ProfileVersion) reasons.push('P9_PROFILE_NOT_CONFIGURED');

  return {
    status: reasons.length === 0 ? 'P9_BLOCKED' : 'P9_NOT_CONFIGURED',
    reasons,
  };
}

export function getTemplateP9Baseline(): {
  total: number;
  byStatus: Record<OfficialTemplateP9Status, number>;
  byTemplateStatus: Record<string, number>;
} {
  const manifest = loadManifest();
  const byStatus: Record<OfficialTemplateP9Status, number> = {
    P9_NOT_CONFIGURED: 0,
    P9_BLOCKED: 0,
    P9_READY: 0,
  };
  const byTemplateStatus: Record<string, number> = {};

  for (const template of manifest.templates) {
    const classification = classifyTemplateP9Readiness(template);
    byStatus[classification.status] += 1;
    byTemplateStatus[template.templateStatus] = (byTemplateStatus[template.templateStatus] || 0) + 1;
  }

  return { total: manifest.templates.length, byStatus, byTemplateStatus };
}
