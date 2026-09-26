import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { OfficialTemplate } from '../types/officialTemplate';
import { extractContentXml } from './officialTemplateRenderer';

const FILES_DIR = path.resolve(process.cwd(), 'data', 'official-templates', 'files');
const FIELD_STYLES = ['T11', 'T12', 'T17'] as const;

function countStyleSpans(contentXml: string, styleName: string): number {
  const pattern = new RegExp(
    `<text:span text:style-name="${styleName}">[\\s\\S]*?</text:span>`,
    'g'
  );
  return [...contentXml.matchAll(pattern)].length;
}

export type ArtifactVerificationStatus = 'VERIFIED' | 'MISSING' | 'HASH_MISMATCH' | 'INVALID';

export interface ArtifactVerificationResult {
  status: ArtifactVerificationStatus;
  sha256?: string;
  expectedSha256?: string;
  mimeType?: string;
  byteLength?: number;
  contentXml?: string;
  error?: string;
}

export interface TemplateFieldMappingResult {
  status: 'VERIFIED' | 'MAPPING_INCOMPLETE' | 'INVALID';
  fields: Array<{
    key: string;
    styleName: string | null;
    mapped: boolean;
    required: boolean;
  }>;
  missingRequiredFields: string[];
  error?: string;
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safeResolvedPath(relativePath: string): string | null {
  const resolved = path.resolve(process.cwd(), relativePath);
  const relative = path.relative(FILES_DIR, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

export function verifyOfficialTemplateSource(template: OfficialTemplate): ArtifactVerificationResult {
  if (!template.localFilePath || !template.localFileHash) {
    return { status: 'MISSING', error: 'Official template source path or hash is unavailable.' };
  }

  const resolved = safeResolvedPath(template.localFilePath);
  if (!resolved || !fs.existsSync(resolved)) {
    return { status: 'MISSING', expectedSha256: template.localFileHash, error: 'Official template source file is unavailable.' };
  }

  return verifyOfficialTemplateBuffer(fs.readFileSync(resolved), template.localFileHash);
}

export function verifyOfficialTemplateBuffer(buffer: Buffer, expectedSha256?: string): ArtifactVerificationResult {
  if (!buffer.length) return { status: 'INVALID', error: 'Official template artifact is empty.' };

  const actualSha256 = sha256(buffer);
  const contentXml = extractContentXml(buffer);
  if (!contentXml) {
    return {
      status: 'INVALID',
      sha256: actualSha256,
      expectedSha256,
      byteLength: buffer.length,
      error: 'ODT content.xml is missing or cannot be decompressed.',
    };
  }

  if (expectedSha256 && actualSha256 !== expectedSha256) {
    return {
      status: 'HASH_MISMATCH',
      sha256: actualSha256,
      expectedSha256,
      byteLength: buffer.length,
      contentXml,
      error: 'Official template source hash does not match the manifest.',
    };
  }

  return {
    status: 'VERIFIED',
    sha256: actualSha256,
    expectedSha256,
    mimeType: 'application/vnd.oasis.opendocument.text',
    byteLength: buffer.length,
    contentXml,
  };
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function normalizeOdtText(contentXml: string): string {
  return decodeXml(contentXml
    .replace(/<text:tab\s*\/?>/g, '\t')
    .replace(/<text:line-break\s*\/?>/g, '\n')
    .replace(/<text:p\b[^>]*>/g, '\n')
    .replace(/<text:h\b[^>]*>/g, '\n')
    .replace(/<text:s\b[^>]*\/?>/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function verifyTemplateFieldMapping(
  template: OfficialTemplate,
  contentXml: string,
  options: { strictP9?: boolean } = {}
): TemplateFieldMappingResult {
  if (!contentXml.trim()) {
    return { status: 'INVALID', fields: [], missingRequiredFields: [], error: 'Template content.xml is empty.' };
  }

  const enforceExactlyOne = template.p9Status === 'P9_READY' || options.strictP9 === true;
  const fields = template.fields.map((field, index) => {
    const styleName = FIELD_STYLES[index] || null;
    const spanCount = styleName ? countStyleSpans(contentXml, styleName) : 0;
    const mapped = styleName ? (enforceExactlyOne ? spanCount === 1 : spanCount > 0) : false;
    return { key: field.key, styleName, mapped, required: field.required };
  });
  const missingRequiredFields = fields.filter(field => field.required && !field.mapped).map(field => field.key);
  const invalidP9Fields = enforceExactlyOne
    ? fields.filter(field => field.styleName && !field.mapped).map(field => field.key)
    : [];

  return {
    status: missingRequiredFields.length || invalidP9Fields.length ? 'MAPPING_INCOMPLETE' : 'VERIFIED',
    fields,
    missingRequiredFields: [...missingRequiredFields, ...invalidP9Fields],
  };
}

export function verifyTemplateArtifactAndMapping(
  template: OfficialTemplate,
  buffer: Buffer,
  expectedSha256: string | undefined = template.localFileHash || undefined,
  options: { strictP9?: boolean } = {}
): ArtifactVerificationResult & { mapping?: TemplateFieldMappingResult; normalizedText?: string } {
  const artifact = verifyOfficialTemplateBuffer(buffer, expectedSha256);
  if (artifact.status !== 'VERIFIED' || !artifact.contentXml) return artifact;

  const mapping = verifyTemplateFieldMapping(template, artifact.contentXml, options);
  return {
    ...artifact,
    mapping,
    normalizedText: normalizeOdtText(artifact.contentXml),
  };
}

export { FIELD_STYLES };
