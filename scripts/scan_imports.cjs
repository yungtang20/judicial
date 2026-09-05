const f = require('fs');
const { join } = require('path');
const dir = 'src/components';
const files = f.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(file => {
  const c = f.readFileSync(join(dir, file), 'utf-8');
  const imports = c.match(/from\s+['"]([^'"]+)['"]/g);
  const relevant = imports && imports.filter(i =>
    i.includes('citationVerifier') ||
    i.includes('externalCitationVerifier') ||
    i.includes('twLegalRagClient') ||
    i.includes('generatedDocumentPipeline') ||
    i.includes('universalTriage') ||
    i.includes('legalToolRegistry')
  );
  if (relevant && relevant.length > 0) {
    console.log(file + ': ' + relevant.join(' | '));
  }
});
