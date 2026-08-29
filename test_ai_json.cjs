const assert = require('node:assert/strict');

(async () => {
  const { parseStrictJson } = await import('./src/lib/strictJson.ts');
  assert.deepEqual(parseStrictJson('{"caseType":"civil"}'), { caseType: 'civil' });
  assert.throws(() => parseStrictJson('```json\n{"caseType":"civil"}\n```'), /Invalid JSON/);
  assert.throws(() => parseStrictJson('prefix {"caseType":"civil"}'), /Invalid JSON/);
  assert.throws(() => parseStrictJson('{"caseType":"civil"'), /Invalid JSON/);
  assert.throws(() => parseStrictJson('null'), /JSON object or array/);
  console.log('Strict AI JSON tests passed');
})();
