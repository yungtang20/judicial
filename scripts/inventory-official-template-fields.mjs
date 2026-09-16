import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readOdtEntries } from './sync-official-templates.mjs';

const manifestPath = path.resolve('data/official-templates/manifest.json');
const outputPath = path.resolve('data/official-templates/field-candidates.json');

function plainText(xml) {
  return xml
    .replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, (_match, count) => ' '.repeat(Number(count || 1)))
    .replace(/<text:(?:tab|line-break)\s*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function underlinedStyles(xml) {
  const styles = new Set();
  for (const match of xml.matchAll(/<style:style\b[^>]*style:name="([^"]+)"[^>]*>([\s\S]*?)<\/style:style>/g)) {
    if (/style:text-underline-style="(?!none)[^"]+"/.test(match[2])) styles.add(match[1]);
  }
  return styles;
}

function extractCandidates(contentXml, stylesXml = '') {
  const styles = underlinedStyles(`${stylesXml}\n${contentXml}`);
  const occurrences = new Map();
  const candidates = [];
  for (const match of contentXml.matchAll(/<text:span\b[^>]*text:style-name="([^"]+)"[^>]*>([\s\S]*?)<\/text:span>/g)) {
    const style = match[1];
    const text = plainText(match[2]);
    if (!styles.has(style) && !/^[_.．。·\-\s]{2,}$/.test(text)) continue;
    const occurrence = (occurrences.get(style) || 0) + 1;
    occurrences.set(style, occurrence);
    const start = match.index || 0;
    const end = start + match[0].length;
    candidates.push({
      style,
      occurrence,
      existingText: text,
      contextBefore: plainText(contentXml.slice(Math.max(0, start - 500), start)).slice(-60),
      contextAfter: plainText(contentXml.slice(end, Math.min(contentXml.length, end + 500))).slice(0, 60),
    });
  }
  return candidates;
}

function extractLiteralCandidates(contentXml) {
  const candidates = [];
  let occurrence = 0;
  for (const match of contentXml.matchAll(/○{2,}/g)) {
    occurrence += 1;
    const start = match.index || 0;
    const end = start + match[0].length;
    candidates.push({
      token: match[0],
      occurrence,
      contextBefore: plainText(contentXml.slice(Math.max(0, start - 500), start)).slice(-60),
      contextAfter: plainText(contentXml.slice(end, Math.min(contentXml.length, end + 500))).slice(0, 60),
    });
  }
  return candidates;
}

const manifestBytes = await readFile(manifestPath);
const templates = JSON.parse(manifestBytes.toString('utf8'));
const inventory = [];
let candidateCount = 0;
let templatesWithCandidates = 0;
let literalCandidateCount = 0;
let templatesWithLiteralCandidates = 0;

for (const template of templates) {
  if (!template.localFilePath?.endsWith('.odt')) continue;
  const entries = readOdtEntries(await readFile(path.resolve(template.localFilePath)));
  const contentXml = entries.get('content.xml').toString('utf8');
  const candidates = extractCandidates(
    contentXml,
    entries.get('styles.xml')?.toString('utf8') || '',
  );
  const literalCandidates = extractLiteralCandidates(contentXml);
  if (candidates.length) templatesWithCandidates += 1;
  if (literalCandidates.length) templatesWithLiteralCandidates += 1;
  candidateCount += candidates.length;
  literalCandidateCount += literalCandidates.length;
  inventory.push({ id: template.id, category: template.category, code: template.code, name: template.name, localFileHash: template.localFileHash, candidates, literalCandidates });
}

const output = {
  manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  templatesScanned: inventory.length,
  templatesWithCandidates,
  candidateCount,
  templatesWithLiteralCandidates,
  literalCandidateCount,
  note: 'Heuristic candidates only. Literal slots and underlined spans are not approved semantic mappings. Human review must bind fields and approved mappings to localFileHash.',
  templates: inventory,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ templatesScanned: inventory.length, templatesWithCandidates, candidateCount, templatesWithLiteralCandidates, literalCandidateCount, outputPath }));
