const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modules = [
  'judicialCredentials.ts', 'tlrSearch.ts', 'precedentVerification.ts',
  'caseQuery.ts', 'strictJson.ts', 'geminiGeneration.ts'
];
const indirectEdges = [
  ['normalizeTaiwanCaseQuery', 'tlrSearch.ts', 'searchTlr'],
  ['judicialUpstreamError', 'judicialCredentials.ts', 'normalizeJudicialResponse'],
  ['normalizeCitation', 'precedentVerification.ts', 'verifyPrecedents']
];

const server = fs.readFileSync('server.ts', 'utf8');
for (const moduleName of modules) {
  const source = fs.readFileSync(path.join('src', 'lib', moduleName), 'utf8');
  const exports = [...source.matchAll(/export (?:async )?function (\w+)/g)].map((match) => match[1]);
  assert.ok(exports.length > 0, `${moduleName} must declare exported functions`);
  const modulePattern = moduleName.replace(/\.ts$/, '(?:\\.ts|\\.js)');
  assert.match(server, new RegExp(`from ["']\\./src/lib/${modulePattern}`), `${moduleName} is not imported by server.ts`);
  for (const exportName of exports) {
    const directCall = new RegExp(`\\b${exportName}\\s*\\(`).test(server.replace(new RegExp(`export function ${exportName}`), ''));
    const edge = indirectEdges.find(([name]) => name === exportName);
    if (edge) {
      const [, callerModule, caller] = edge;
      assert.match(server, new RegExp(`\\b${caller}\\s*\\(`));
      assert.match(fs.readFileSync(path.join('src', 'lib', callerModule), 'utf8'), new RegExp(`\\b${exportName}\\s*\\(`));
    } else {
      assert.ok(directCall, `${moduleName}.${exportName} is not called by server.ts`);
    }
  }
}
console.log('Wiring export tests passed');
