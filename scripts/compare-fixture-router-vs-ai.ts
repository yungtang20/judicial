import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'src/test/case-fixture.json'), 'utf8'));
const run1 = fs.existsSync(path.join(root, 'src/test/case-fixture-run-batch1.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'src/test/case-fixture-run-batch1.json'), 'utf8')) : [];
const run2 = fs.existsSync(path.join(root, 'src/test/case-fixture-run-batch2.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'src/test/case-fixture-run-batch2.json'), 'utf8')) : [];
const runs = [...run1, ...run2];
const ai = fs.existsSync(path.join(root, 'src/test/case-fixture-ai-eval.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'src/test/case-fixture-ai-eval.json'), 'utf8')) : [];
const rows = [];
for (const c of fixture) {
  const run = runs.find((r:any) => r['案由'] === c.案由);
  const aiRow = ai.find((r:any) => r['案由'] === c.案由);
  rows.push({
    案由: c.案由,
    ruleBasedCause: run?.msg || null,
    aiCaseType: aiRow?.ai?.caseType || null,
    aiLegalBasis: Array.isArray(aiRow?.ai?.legalBasis) ? aiRow.ai.legalBasis.join('；') : null,
    aiOk: aiRow?.ok === true,
    aiError: aiRow?.error || null,
    httpOk: run?.ok === true,
    httpStatus: run?.status || null
  });
}
fs.writeFileSync(path.join(root, 'src/test/case-fixture-ai-vs-rule.json'), JSON.stringify(rows, null, 2), 'utf8');
console.log(rows.map(r => `${r.案由} | rule:${String(r.ruleBasedCause).slice(0,36)} | ai:${r.aiCaseType} | ok:${r.httpOk}`).join('\n'));
