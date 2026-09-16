/**
 * Official Template Renderer
 * Merges user data into ODT templates, produces new ODT files
 * Does NOT modify the original template file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { loadManifest, getTemplateById } from './officialTemplateManifest';
import type {
  OfficialTemplate,
  OfficialTemplateField,
  OfficialTemplateFieldMapping,
  RenderTemplateResponse,
} from '../types/officialTemplate';

const FILES_DIR = path.resolve(process.cwd(), 'data', 'official-templates', 'files');

function resolveTemplatePath(localFilePath: string): string | null {
  const resolved = path.resolve(process.cwd(), localFilePath);
  const relative = path.relative(FILES_DIR, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? resolved : null;
}
/**
 * Build mappings only from reviewed, explicit manifest entries.
 */
function buildFieldMapping(template: OfficialTemplate): Array<OfficialTemplateFieldMapping & OfficialTemplateField> {
  if (!template.localFileHash || template.fieldMappingHash !== template.localFileHash) return [];
  const fieldsByKey = new Map((template.fields || []).map(field => [field.key, field]));
  return (template.fieldMappings || []).flatMap(mapping => {
    const field = fieldsByKey.get(mapping.key);
    return field ? [{ ...field, ...mapping }] : [];
  });
}

export interface TemplateMappingValidation {
  valid: boolean;
  issues: string[];
  mappedKeys: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function styleSpanPattern(style: string): RegExp {
  return new RegExp(
    `(<text:span text:style-name="${escapeRegExp(style)}">)([^<]*(?:<text:s[^>]*\\/>[^<]*)*)(</text:span>)`,
    'g'
  );
}

function literalOccurrences(content: string, literal: string): number[] {
  const indexes: number[] = [];
  for (let offset = 0; offset <= content.length - literal.length;) {
    const index = content.indexOf(literal, offset);
    if (index < 0) break;
    indexes.push(index);
    offset = index + literal.length;
  }
  return indexes;
}

/** Validate reviewed mappings against the exact hash-bound ODT source. */
export function validateTemplateMapping(template: OfficialTemplate): TemplateMappingValidation {
  const issues: string[] = [];
  if (!template.localFileHash || template.fieldMappingHash !== template.localFileHash) {
    issues.push('FIELD_MAPPING_HASH_MISMATCH');
  }
  if (!template.localFilePath) return { valid: false, issues: [...issues, 'TEMPLATE_NOT_DOWNLOADED'], mappedKeys: [] };

  const absPath = resolveTemplatePath(template.localFilePath);
  if (!absPath || !fs.existsSync(absPath)) {
    return { valid: false, issues: [...issues, 'TEMPLATE_FILE_MISSING'], mappedKeys: [] };
  }
  const contentXml = extractContentXml(fs.readFileSync(absPath));
  if (!contentXml) return { valid: false, issues: [...issues, 'TEMPLATE_PARSE_ERROR'], mappedKeys: [] };

  const fields = new Set((template.fields || []).map(field => field.key));
  const seenKeys = new Set<string>();
  const seenLocators = new Set<string>();
  const mappedKeys: string[] = [];

  for (const mapping of template.fieldMappings || []) {
    const occurrence = mapping.occurrence ?? 1;
    if (!fields.has(mapping.key)) issues.push(`UNKNOWN_FIELD:${mapping.key}`);
    if (seenKeys.has(mapping.key)) issues.push(`DUPLICATE_FIELD:${mapping.key}`);
    seenKeys.add(mapping.key);
    const hasStyle = typeof mapping.odtStyle === 'string';
    const hasLiteral = typeof mapping.literalText === 'string';
    const validStyle = hasStyle && /^[A-Za-z0-9_.-]{1,128}$/.test(mapping.odtStyle!);
    const validLiteral = hasLiteral && mapping.literalText!.length > 0 && mapping.literalText!.length <= 256 &&
      !/[<>&]/.test(mapping.literalText!);
    if (hasStyle === hasLiteral || (!validStyle && !validLiteral) || !Number.isInteger(occurrence) || occurrence < 1 ||
        (hasLiteral && mapping.expectedText !== undefined)) {
      issues.push(`INVALID_LOCATOR:${mapping.key}`);
      continue;
    }
    const locator = hasStyle
      ? `style:${mapping.odtStyle}#${occurrence}`
      : `literal:${mapping.literalText}#${occurrence}`;
    if (seenLocators.has(locator)) issues.push(`DUPLICATE_LOCATOR:${locator}`);
    seenLocators.add(locator);

    const matches = hasStyle ? [...contentXml.matchAll(styleSpanPattern(mapping.odtStyle!))] : [];
    const match = matches[occurrence - 1];
    const literalFound = hasLiteral && literalOccurrences(contentXml, mapping.literalText!).length >= occurrence;
    if ((hasStyle && !match) || (hasLiteral && !literalFound)) {
      issues.push(`LOCATOR_NOT_FOUND:${locator}`);
      continue;
    }
    if (hasStyle && mapping.expectedText !== undefined && xmlToPlainText(match![2]) !== mapping.expectedText) {
      issues.push(`EXPECTED_TEXT_MISMATCH:${locator}`);
      continue;
    }
    if (fields.has(mapping.key)) mappedKeys.push(mapping.key);
  }

  return { valid: issues.length === 0, issues, mappedKeys: [...new Set(mappedKeys)] };
}

/**
 * Extract text content from ODT content.xml, identifying underlined placeholder fields.
 * Returns ALL manifest fields with their ODT span status (hasSpan: true/false).
 * Fields with hasSpan=false and required=true are unmapped required fields.
 */
export function extractTemplateFields(template: OfficialTemplate): OfficialTemplateField[] {
  if (!template.localFilePath) return [];

  const absPath = resolveTemplatePath(template.localFilePath);
  if (!absPath || !fs.existsSync(absPath)) return [];

  return [...new Map((template.fields || []).map(field => [field.key, field])).values()];
}

/**
 * Extract content.xml from an ODT (ZIP) buffer
 */
function extractContentXml(zipBuf: Buffer): string | null {
  return extractZipEntries(zipBuf)?.find(entry => entry.name === 'content.xml')?.data.toString('utf8') || null;
}

function extractZipEntries(zipBuf: Buffer): Array<{ name: string; data: Buffer }> | null {
  const entries: Array<{ name: string; data: Buffer }> = [];
  const names = new Set<string>();
  let offset = 0;
  while (offset + 30 <= zipBuf.length && zipBuf.readUInt32LE(offset) === 0x04034b50) {
    const compressionMethod = zipBuf.readUInt16LE(offset + 8);
    const compressedSize = zipBuf.readUInt32LE(offset + 18);
    const fileNameLength = zipBuf.readUInt16LE(offset + 26);
    const extraFieldLength = zipBuf.readUInt16LE(offset + 28);
    const nameEnd = offset + 30 + fileNameLength;
    const dataOffset = nameEnd + extraFieldLength;
    const dataEnd = dataOffset + compressedSize;
    if (dataEnd > zipBuf.length) return null;
    const name = zipBuf.subarray(offset + 30, nameEnd).toString('utf8');
    if (!name || names.has(name)) return null;
    names.add(name);
    const compressed = zipBuf.subarray(dataOffset, dataEnd);
    try {
      const data = compressionMethod === 0
        ? Buffer.from(compressed)
        : compressionMethod === 8
          ? inflateRawSync(compressed)
          : null;
      if (!data) return null;
      entries.push({ name, data });
    } catch {
      return null;
    }
    offset = dataEnd;
  }
  return entries.length ? entries : null;
}

export interface RenderedOdtArtifactVerification {
  valid: boolean;
  issues: string[];
  sourceHash?: string;
  artifactHash?: string;
  documentText?: string;
}

/** Verify that rendering changed only the reviewed content.xml field locations. */
export function verifyRenderedOdtArtifact(
  template: OfficialTemplate,
  fields: Record<string, string>,
  artifact: Buffer
): RenderedOdtArtifactVerification {
  const mapping = validateTemplateMapping(template);
  if (!mapping.valid || !template.localFilePath || !template.localFileHash) {
    return { valid: false, issues: mapping.issues.length ? mapping.issues : ['TEMPLATE_MAPPING_INCOMPLETE'] };
  }
  const absPath = resolveTemplatePath(template.localFilePath);
  if (!absPath || !fs.existsSync(absPath)) return { valid: false, issues: ['TEMPLATE_FILE_MISSING'] };

  const source = fs.readFileSync(absPath);
  const sourceHash = createHash('sha256').update(source).digest('hex');
  if (sourceHash !== template.localFileHash) return { valid: false, issues: ['TEMPLATE_SOURCE_HASH_MISMATCH'], sourceHash };

  const sourceEntries = extractZipEntries(source);
  const artifactEntries = extractZipEntries(artifact);
  if (!sourceEntries || !artifactEntries) return { valid: false, issues: ['ODT_PACKAGE_INVALID'], sourceHash };
  const sourceNames = sourceEntries.map(entry => entry.name);
  const artifactNames = artifactEntries.map(entry => entry.name);
  if (sourceNames.length !== artifactNames.length || sourceNames.some((name, index) => name !== artifactNames[index])) {
    return { valid: false, issues: ['ODT_ENTRY_SET_CHANGED'], sourceHash };
  }

  const sourceByName = new Map(sourceEntries.map(entry => [entry.name, entry.data]));
  const artifactByName = new Map(artifactEntries.map(entry => [entry.name, entry.data]));
  const sourceContent = sourceByName.get('content.xml')?.toString('utf8');
  const artifactContent = artifactByName.get('content.xml')?.toString('utf8');
  if (!sourceContent || !artifactContent) return { valid: false, issues: ['ODT_CONTENT_XML_MISSING'], sourceHash };
  if (artifactContent !== replaceFieldsInXml(sourceContent, fields, template)) {
    return { valid: false, issues: ['ODT_CONTENT_XML_UNEXPECTED_CHANGE'], sourceHash };
  }
  for (const name of sourceNames) {
    if (name === 'content.xml') continue;
    if (!sourceByName.get(name)?.equals(artifactByName.get(name)!)) {
      return { valid: false, issues: [`ODT_ENTRY_CHANGED:${name}`], sourceHash };
    }
  }

  return {
    valid: true,
    issues: [],
    sourceHash,
    artifactHash: createHash('sha256').update(artifact).digest('hex'),
    documentText: xmlToPlainText(artifactContent),
  };
}

/**
 * Replace field values in content.xml.
 * Accepts both semantic keys (caseNumber, defendantName, gender) and generic keys (field_0, field_1, field_2).
 * Semantic keys are preferred; generic keys serve as fallback for backward compatibility.
 */
function replaceFieldsInXml(contentXml: string, fields: Record<string, string>, template: OfficialTemplate): string {
  let result = contentXml;
  const fieldMapping = buildFieldMapping(template);

  // Build a resolved values array: semantic key → value, fallback to generic key
  const resolvedValues: string[] = [];
  for (let i = 0; i < fieldMapping.length; i++) {
    const entry = fieldMapping[i];
    let value = fields[entry.key];
    if (!value) {
      const genericKey = `field_${i}`;
      value = fields[genericKey];
    }
    resolvedValues.push(value || '');
  }

  // Replace only the reviewed occurrence. Never replace every span sharing a style.
  for (let i = 0; i < fieldMapping.length; i++) {
    const entry = fieldMapping[i];
    const value = resolvedValues[i];
    const targetOccurrence = entry.occurrence ?? 1;
    if (entry.odtStyle) {
      let occurrence = 0;
      result = result.replace(styleSpanPattern(entry.odtStyle), (match, open, _content, close) => {
        occurrence += 1;
        return occurrence === targetOccurrence ? `${open}${escapeXml(value)}${close}` : match;
      });
    } else if (entry.literalText) {
      const indexes = literalOccurrences(result, entry.literalText);
      const index = indexes[targetOccurrence - 1];
      if (index !== undefined) {
        result = `${result.slice(0, index)}${escapeXml(value)}${result.slice(index + entry.literalText.length)}`;
      }
    }
  }

  return result;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Rebuild ODT file from modified content.xml
 */
function rebuildOdt(originalOdtPath: string, newContentXml: string): Buffer {
  const sourceEntries = extractZipEntries(fs.readFileSync(originalOdtPath));
  if (!sourceEntries) throw new Error('Invalid ODT package');
  const entries = sourceEntries.map(entry => entry.name === 'content.xml'
    ? { name: entry.name, data: Buffer.from(newContentXml, 'utf8') }
    : entry
  );

  // Rebuild as a new ZIP with all entries stored (no compression)
  const { ZIP_LOCAL_HEADER, ZIP_CENTRAL_DIR, ZIP_END_OF_CENTRAL_DIR } = buildZip(entries);
  return Buffer.concat([ZIP_LOCAL_HEADER, ZIP_CENTRAL_DIR, ZIP_END_OF_CENTRAL_DIR]);
}

function xmlToPlainText(xml: string): string {
  return xml
    .replace(/<text:(?:line-break|tab)\s*\/>/g, '\n')
    .replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, (_match, count) => ' '.repeat(Number(count || 1)))
    .replace(/<\/text:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function buildZip(entries: Array<{ name: string; data: Buffer }>) {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression: stored
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc32(entry.data), 14); // crc32
    localHeader.writeUInt32LE(entry.data.length, 18); // compressed size
    localHeader.writeUInt32LE(entry.data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, entry.data);

    // Central directory
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // compression
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc32(entry.data), 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // offset
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirOffset = offset;
  const centralDirBuf = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuf.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // central dir disk
  eocd.writeUInt16LE(entries.length, 8); // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return {
    ZIP_LOCAL_HEADER: Buffer.concat(localHeaders),
    ZIP_CENTRAL_DIR: centralDirBuf,
    ZIP_END_OF_CENTRAL_DIR: eocd,
  };
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Main render function: merges user fields into a template, produces new ODT
 */
export function renderTemplate(
  templateId: string,
  fields: Record<string, string>
): RenderTemplateResponse {
  const template = getTemplateById(templateId);
  if (!template) {
    return { success: false, error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' };
  }

  if (template.templateStatus === 'NEEDS_FIELD_MAPPING') {
    const mappedKeys = new Set(validateTemplateMapping(template).mappedKeys);
    const unmappedRequired = (template.fields || [])
      .filter(field => field.required && !mappedKeys.has(field.key))
      .map(field => field.key);
    return {
      success: false,
      error: 'Template mapping incomplete: required fields have no ODT position',
      code: 'TEMPLATE_MAPPING_INCOMPLETE',
      missingFields: unmappedRequired,
    };
  }

  if (template.templateStatus !== 'READY_FOR_MERGE') {
    return {
      success: false,
      error: `Template status is ${template.templateStatus}, cannot render`,
      code: 'TEMPLATE_NOT_RENDERABLE',
    };
  }

  if (!template.localFilePath) {
    return { success: false, error: 'Template file not downloaded', code: 'TEMPLATE_NOT_DOWNLOADED' };
  }

  const absPath = resolveTemplatePath(template.localFilePath);
  if (!absPath) {
    return { success: false, error: 'Template file path is outside the approved directory', code: 'TEMPLATE_PATH_INVALID' };
  }
  if (!fs.existsSync(absPath)) {
    return { success: false, error: 'Template file missing from disk', code: 'TEMPLATE_FILE_MISSING' };
  }

  // Check required fields: ALL required fields must have ODT span positions.
  // If any required field lacks an ODT span, fail-closed with TEMPLATE_MAPPING_INCOMPLETE.
  const manifestFields = template.fields || [];
  const mappingValidation = validateTemplateMapping(template);
  if (!mappingValidation.valid) {
    const mappedKeys = new Set(
      mappingValidation.issues.includes('FIELD_MAPPING_HASH_MISMATCH') ? [] : mappingValidation.mappedKeys
    );
    const unmappedRequired = manifestFields
      .filter(field => field.required && !mappedKeys.has(field.key))
      .map(field => field.key);
    return {
      success: false,
      error: 'Template mapping incomplete or no longer matches the reviewed source',
      code: 'TEMPLATE_MAPPING_INCOMPLETE',
      missingFields: unmappedRequired.length ? unmappedRequired : mappingValidation.issues,
    };
  }
  const fieldMapping = buildFieldMapping(template);
  const odtKeySet = new Set(fieldMapping.map(e => e.key));
  const missingFields: string[] = [];
  const unmappedRequired: string[] = [];

  for (const mf of manifestFields) {
    if (!mf.required) continue;
    const hasOdtSpan = odtKeySet.has(mf.key);
    if (!hasOdtSpan) {
      unmappedRequired.push(mf.key);
      continue;
    }
    const semanticVal = fields[mf.key];
    const genericIdx = fieldMapping.findIndex(e => e.key === mf.key);
    const genericKey = `field_${genericIdx}`;
    const genericVal = fields[genericKey];
    if ((!semanticVal || !semanticVal.trim()) && (!genericVal || !genericVal.trim())) {
      missingFields.push(mf.key);
    }
  }

  // Fail-closed: required field without ODT span = mapping incomplete
  if (unmappedRequired.length > 0) {
    return {
      success: false,
      error: `Template mapping incomplete: required fields have no ODT position`,
      code: 'TEMPLATE_MAPPING_INCOMPLETE',
      missingFields: unmappedRequired,
    };
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      error: 'Missing required fields',
      code: 'MISSING_REQUIRED_FIELDS',
      missingFields,
    };
  }

  // Read original ODT, extract content.xml, replace fields, rebuild
  try {
    const zipBuf = fs.readFileSync(absPath);
    const contentXml = extractContentXml(zipBuf);
    if (!contentXml) {
      return { success: false, error: 'Cannot parse template content.xml', code: 'TEMPLATE_PARSE_ERROR' };
    }

    const newContentXml = replaceFieldsInXml(contentXml, fields, template);

    const outputFileName = `${templateId}-${Date.now()}.odt`;
    const outputBuf = rebuildOdt(absPath, newContentXml);
    const artifactVerification = verifyRenderedOdtArtifact(template, fields, outputBuf);
    if (!artifactVerification.valid) {
      return {
        success: false,
        error: 'Rendered ODT artifact integrity verification failed',
        code: 'TEMPLATE_ARTIFACT_VERIFICATION_FAILED',
        missingFields: artifactVerification.issues,
      };
    }

    return {
      success: true,
      documentBase64: outputBuf.toString('base64'),
      fileName: outputFileName,
      mimeType: 'application/vnd.oasis.opendocument.text',
      documentText: artifactVerification.documentText,
      verification: {
        sourceHash: artifactVerification.sourceHash,
        artifactHash: artifactVerification.artifactHash,
        artifactIntegrity: 'VERIFIED',
      },
    };
  } catch (err: any) {
    return { success: false, error: `Render failed: ${err.message}`, code: 'RENDER_FAILED' };
  }
}
