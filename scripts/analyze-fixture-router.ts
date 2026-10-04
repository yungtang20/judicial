import fs from 'node:fs';
import path from 'node:path';
import { buildIntelligentRuleBasedTriage, evaluateNarrativeCompleteness } from '../src/lib/universalTriage.js';
const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/test/case-fixture.json'), 'utf8'));
for (const c of fixture) {
  const q = String(c.案情摘要 || '');
  const t = buildIntelligentRuleBasedTriage(q);
  const comp = evaluateNarrativeCompleteness(q);
  console.log(c.案由, '=>', t.identifiedIssue, '| isComplete:', comp.isComplete, '| missing:', comp.missingElements.join('/'));
}
