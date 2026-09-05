const f = require('fs');
const { join } = require('path');

// Scan both src/components and src/lib
const dirs = ['src/components', 'src/lib'];
const patterns = [
  /citationVerifier/,
  /externalCitationVerifier/,
  /twLegalRagClient/,
  /generatedDocumentPipeline/,
  /universalTriage/,
  /legalToolRegistry/,
];

dirs.forEach(dir => {
  try {
    const files = f.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    files.forEach(file => {
      const fullPath = join(dir, file);
      const c = f.readFileSync(fullPath, 'utf-8');
      const lines = c.split('\n');
      lines.forEach((line, i) => {
        patterns.forEach(p => {
          if (p.test(line) && !line.includes('services/')) {
            console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
          }
        });
      });
    });
  } catch (e) {}
});
