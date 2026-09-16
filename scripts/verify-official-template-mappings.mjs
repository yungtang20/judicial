import { loadManifest } from '../src/lib/officialTemplateManifest.ts';
import { validateTemplateMapping } from '../src/lib/officialTemplateRenderer.ts';

const manifest = loadManifest();
const failures = [];
let reviewed = 0;
let ready = 0;

for (const template of manifest.templates) {
  const hasReview = Boolean(template.fieldMappingHash || template.fieldMappings?.length);
  if (!hasReview && template.templateStatus !== 'READY_FOR_MERGE') continue;
  reviewed += 1;

  const validation = validateTemplateMapping(template);
  const mappedKeys = new Set(validation.mappedKeys);
  const missingRequired = (template.fields || [])
    .filter(field => field.required && !mappedKeys.has(field.key))
    .map(field => field.key);

  if (template.templateStatus === 'READY_FOR_MERGE') {
    ready += 1;
    if (!template.fields?.length || !validation.valid || missingRequired.length) {
      failures.push({ id: template.id, issues: validation.issues, missingRequired });
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ reviewed, ready, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ templates: manifest.totalTemplates, reviewed, ready, failures: 0 }));
}
