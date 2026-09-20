/**
 * Official Template Manifest Loader
 * Loads the scraped manifest from data/official-templates/manifest.json
 */
import fs from 'node:fs';
import path from 'node:path';
import type { OfficialTemplate, OfficialTemplateManifest, TemplateStatus } from '../types/officialTemplate';

const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'official-templates', 'manifest.json');

let _cache: OfficialTemplateManifest | null = null;

export function loadManifest(): OfficialTemplateManifest {
  if (_cache) return _cache;

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}. Run the scraper first.`);
  }

  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as OfficialTemplate[];
  _cache = {
    verifiedOn: null,
    totalTemplates: raw.length,
    templates: raw,
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
