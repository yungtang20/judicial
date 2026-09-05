const f = require('fs');

const changes = [];

function migrateFile(filePath, replacements) {
  let content = f.readFileSync(filePath, 'utf-8');
  let changed = false;
  replacements.forEach(([oldImport, newImport]) => {
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      changed = true;
      changes.push(`${filePath}: ${oldImport} → ${newImport}`);
    }
  });
  if (changed) {
    f.writeFileSync(filePath, content, 'utf-8');
    console.log(`UPDATED: ${filePath}`);
  } else {
    console.log(`SKIPPED (no match): ${filePath}`);
  }
}

// ── Component imports only → services/ ─────────────────────────────────────────

// IssueTableGenerator: verifyLegalCitations → citationCheck
migrateFile('src/components/IssueTableGenerator.tsx', [
  ["from '../lib/citationVerifier'", "from '../lib/services/citationCheck'"],
]);

// LegalDocAiChecker: verifyLegalCitations + ExternalCitationResult → citationCheck
migrateFile('src/components/LegalDocAiChecker.tsx', [
  ["from '../lib/citationVerifier'", "from '../lib/services/citationCheck'"],
  ["from '../lib/externalCitationVerifier'", "from '../lib/services/citationCheck'"],
]);

// LegalSourcesDisplay: LegalSearchSources → legalSearch
migrateFile('src/components/LegalSourcesDisplay.tsx', [
  ["from '../lib/twLegalRagClient.js'", "from '../lib/services/legalSearch'"],
  ["from '../lib/twLegalRagClient'", "from '../lib/services/legalSearch'"],
]);

// SmartAppealAssistant: verifyLegalCitations → citationCheck
migrateFile('src/components/SmartAppealAssistant.tsx', [
  ['from "../lib/citationVerifier"', 'from "../lib/services/citationCheck"'],
]);

// ── Internal lib files: NO CHANGE (avoids circular dependency) ────────────────
// generatedDocumentPipeline.ts → stays importing from ./citationVerifier
// legalInputPrecheck.ts          → stays importing from ./citationVerifier
// Test files                     → stay importing original modules

console.log('\n=== Summary ===');
changes.forEach(c => console.log(c));
console.log(`\nTotal: ${changes.length} import(s) migrated`);
