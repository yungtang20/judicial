import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getTemplateById } from '../src/lib/officialTemplateManifest.ts';
import { renderTemplate, validateTemplateMapping } from '../src/lib/officialTemplateRenderer.ts';

const proposalPath = path.resolve(process.argv[2] || 'data/official-templates/mapping-proposals/judicial-0102-66.json');
const proposalBuffer = fs.readFileSync(proposalPath);
const proposal = JSON.parse(proposalBuffer.toString('utf8'));
if (proposal.proposalStatus !== 'AI_PROPOSED_REQUIRES_HUMAN_REVIEW') {
  throw new Error('Proposal must remain AI_PROPOSED_REQUIRES_HUMAN_REVIEW');
}

const template = getTemplateById(proposal.templateId);
if (!template || template.localFileHash !== proposal.sourceHash) throw new Error('Proposal source hash mismatch');
if (template.templateStatus === 'READY_FOR_MERGE') throw new Error('Preview command cannot review an already-ready template');

Object.assign(template, {
  templateStatus: 'READY_FOR_MERGE',
  fields: proposal.fields,
  fieldMappings: proposal.fieldMappings,
  fieldMappingHash: proposal.sourceHash,
});
const mapping = validateTemplateMapping(template);
if (!mapping.valid) throw new Error(`Invalid proposal: ${mapping.issues.join(', ')}`);

const result = renderTemplate(template.id, proposal.syntheticSample);
if (!result.success || !result.documentBase64 || result.verification?.artifactIntegrity !== 'VERIFIED') {
  throw new Error(`Preview render failed: ${result.code || result.error}`);
}
for (const value of Object.values(proposal.syntheticSample)) {
  if (value && !result.documentText?.includes(String(value))) throw new Error(`Preview is missing sample value: ${value}`);
}

const outputDir = path.resolve('temp', 'official-template-previews');
fs.mkdirSync(outputDir, { recursive: true });
const odtPath = path.join(outputDir, `${template.id}-synthetic-review.odt`);
fs.writeFileSync(odtPath, Buffer.from(result.documentBase64, 'base64'));

const soffice = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'LibreOffice', 'program', 'soffice.exe');
let pdfPath = null;
if (fs.existsSync(soffice)) {
  execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, odtPath], { stdio: 'pipe' });
  const converted = path.join(outputDir, `${path.parse(odtPath).name}.pdf`);
  if (fs.existsSync(converted)) pdfPath = converted;
}

const evidence = {
  reviewStatus: 'AWAITING_HUMAN_APPROVAL',
  proposalStatus: proposal.proposalStatus,
  templateId: template.id,
  mappedFields: mapping.mappedKeys.length,
  sourceHash: result.verification.sourceHash,
  proposalHash: createHash('sha256').update(proposalBuffer).digest('hex'),
  rendererHash: createHash('sha256').update(fs.readFileSync(path.resolve('src/lib/officialTemplateRenderer.ts'))).digest('hex'),
  artifactHash: result.verification.artifactHash,
  pdfHash: pdfPath ? createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex') : null,
  odtPath,
  pdfPath,
  reviewChecklist: proposal.reviewChecklist,
};
const evidencePath = path.join(outputDir, `${template.id}-review-evidence.json`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
