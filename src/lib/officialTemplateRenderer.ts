/**
 * Official Template Renderer
 * Merges user data into ODT templates, produces new ODT files
 * Does NOT modify the original template file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { loadManifest, getTemplateById } from './officialTemplateManifest';
import type { OfficialTemplate, OfficialTemplateField, RenderTemplateResponse } from '../types/officialTemplate';

const FILES_DIR = path.resolve(process.cwd(), 'data', 'official-templates', 'files');

function resolveTemplatePath(localFilePath: string): string | null {
  const resolved = path.resolve(process.cwd(), localFilePath);
  const relative = path.relative(FILES_DIR, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? resolved : null;
}
/**
 * Build mappings only from reviewed, explicit manifest entries.
 */
function buildFieldMapping(template: OfficialTemplate): Array<{ odtStyle: string; key: string; label: string; required: boolean; placeholder?: string; type: string; options?: Array<{ label: string; value: string }> }> {
  if (!template.localFileHash || template.fieldMappingHash !== template.localFileHash) return [];
  const fieldsByKey = new Map((template.fields || []).map(field => [field.key, field]));
  return (template.fieldMappings || []).flatMap(mapping => {
    const field = fieldsByKey.get(mapping.key);
    return field ? [{ ...field, odtStyle: mapping.odtStyle }] : [];
  });
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
  // ODT is a ZIP file. Use minimal ZIP parsing.
  // Find content.xml entry
  let offset = 0;

  while (offset < zipBuf.length - 4) {
    if (zipBuf[offset] === 0x50 && zipBuf[offset + 1] === 0x4B) {
      // Local file header
      const compressionMethod = zipBuf.readUInt16LE(offset + 8);
      const compressedSize = zipBuf.readUInt32LE(offset + 18);
      const fileNameLength = zipBuf.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuf.readUInt16LE(offset + 28);
      const fileName = zipBuf.slice(offset + 30, offset + 30 + fileNameLength).toString('utf-8');

      if (fileName === 'content.xml') {
        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
        const data = zipBuf.slice(dataOffset, dataOffset + compressedSize);

        if (compressionMethod === 0) {
          // Stored (no compression)
          return data.toString('utf-8');
        } else if (compressionMethod === 8) {
          // Deflated
          try {
            return inflateRawSync(data).toString('utf-8');
          } catch {
            return null;
          }
        }
        return null;
      }

      // Skip to next entry
      offset += 30 + fileNameLength + extraFieldLength + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
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

  // Replace each underline style in order, tracking position per style
  for (let i = 0; i < fieldMapping.length; i++) {
    const entry = fieldMapping[i];
    const value = resolvedValues[i];

    const pattern = new RegExp(
      `(<text:span text:style-name="${entry.odtStyle}">)([^<]*(?:<text:s[^>]*\\/>[^<]*)*)(</text:span>)`,
      'g'
    );

    result = result.replace(pattern, (match, open, _content, close) => {
      return `${open}${escapeXml(value)}${close}`;
    });
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
  const zipBuf = fs.readFileSync(originalOdtPath);
  const entries: Array<{ name: string; data: Buffer; offset: number; localHeaderOffset: number }> = [];

  let offset = 0;
  while (offset < zipBuf.length - 4) {
    if (zipBuf[offset] === 0x50 && zipBuf[offset + 1] === 0x4B) {
      const compressionMethod = zipBuf.readUInt16LE(offset + 8);
      const compressedSize = zipBuf.readUInt32LE(offset + 18);
      const fileNameLength = zipBuf.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuf.readUInt16LE(offset + 28);
      const fileName = zipBuf.slice(offset + 30, offset + 30 + fileNameLength).toString('utf-8');
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

      let data = zipBuf.slice(dataOffset, dataOffset + compressedSize);

      if (fileName === 'content.xml') {
        data = Buffer.from(newContentXml, 'utf-8');
        // For simplicity, store uncompressed
        entries.push({
          name: fileName,
          data,
          offset: -1, // will be calculated
          localHeaderOffset: offset,
        });
      } else {
        if (compressionMethod === 8) {
          data = inflateRawSync(data);
        } else if (compressionMethod !== 0) {
          throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
        }
        entries.push({
          name: fileName,
          data,
          offset: -1,
          localHeaderOffset: offset,
        });
      }

      offset = dataOffset + compressedSize;
    } else {
      break;
    }
  }

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
    const mappedKeys = new Set(buildFieldMapping(template).map(field => field.key));
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

    return {
      success: true,
      documentBase64: outputBuf.toString('base64'),
      fileName: outputFileName,
      mimeType: 'application/vnd.oasis.opendocument.text',
      documentText: xmlToPlainText(newContentXml),
    };
  } catch (err: any) {
    return { success: false, error: `Render failed: ${err.message}`, code: 'RENDER_FAILED' };
  }
}
