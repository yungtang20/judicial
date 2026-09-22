import fs from 'node:fs';
import path from 'node:path';

export interface OfficialTemplateField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface OfficialTemplate {
  id: string;
  category: string;
  code: string;
  name: string;
  sourcePageUrl: string;
  editableFileUrl?: string | null;
  pdfFileUrl?: string | null;
  officialUpdatedAt?: string;
  localFilePath?: string;
  localFileHash?: string;
  templateStatus: string;
  fields?: OfficialTemplateField[];
  fieldMappings?: any[];
  fieldMappingHash?: string;
  downloadedAt?: string | null;
}

export interface OfficialTemplateManifest {
  verifiedOn: string;
  totalTemplates: number;
  templates: OfficialTemplate[];
}

let cachedManifest: OfficialTemplateManifest | null = null;

export function loadManifest(): OfficialTemplateManifest {
  if (cachedManifest) return cachedManifest;

  const manifestPath = path.resolve(process.cwd(), 'data', 'official-templates', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      verifiedOn: '2026-09-15',
      totalTemplates: 0,
      templates: []
    };
  }

  const content = fs.readFileSync(manifestPath, 'utf8');
  const raw = JSON.parse(content);
  const templates: OfficialTemplate[] = Array.isArray(raw) ? raw : (raw.templates || []);

  cachedManifest = {
    verifiedOn: raw.verifiedOn || '2026-09-15',
    totalTemplates: templates.length,
    templates
  };

  return cachedManifest;
}

export function getTemplateById(id: string): OfficialTemplate | undefined {
  const manifest = loadManifest();
  return manifest.templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): OfficialTemplate[] {
  const manifest = loadManifest();
  return manifest.templates.filter(t => t.category === category);
}

export function getAllCategories(): string[] {
  const manifest = loadManifest();
  const categories = new Set<string>();
  for (const t of manifest.templates) {
    if (t.category) categories.add(t.category);
  }
  return Array.from(categories);
}
