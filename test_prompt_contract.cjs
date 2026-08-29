const assert = require('node:assert/strict');

async function run() {
  const { getAnalyzeJudgmentPrompt } = await import('./src/prompts/analyze-judgment.ts');
  const prompt = getAnalyzeJudgmentPrompt('測試判決全文');
  assert.match(prompt, /legalBasis/);
  assert.match(prompt, /禁止填具體判例字號/);
  assert.match(prompt, /判例請交由判例檢索功能另行查證/);
}

run().then(() => console.log('prompt contract tests passed'));
