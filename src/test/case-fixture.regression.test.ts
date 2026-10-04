import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildIntelligentRuleBasedTriage, evaluateNarrativeCompleteness } from '../lib/universalTriage';

const fixturePath = path.join(process.cwd(), 'src/test/case-fixture.json');

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Array<{
  categoryHint: string;
  案由: string;
  發生時間: string | null;
  地點: string | null;
  損失金額: string | null;
  案情摘要: string | null;
}>;

describe('LINE case fixture drives triage pipeline', () => {
  for (const c of fixture) {
    const narrative = c.案情摘要!;
    it(`triages "${c.案由}"`, () => {
      const triage = buildIntelligentRuleBasedTriage(narrative);
      expect(triage).toBeDefined();
      expect(typeof triage.identifiedIssue).toBe('string');
      expect(Array.isArray(triage.legalBasis)).toBe(true);
      expect(Array.isArray(triage.suggestedActions)).toBe(true);
    });

    it(`completeness-checks "${c.案由}"`, () => {
      const completeness = evaluateNarrativeCompleteness(narrative);
      expect(completeness).toBeDefined();
      expect(typeof completeness.isComplete).toBe('boolean');
      expect(Array.isArray(completeness.missingElements)).toBe(true);
      if (!completeness.isComplete) {
        expect(completeness.missingElements.length).toBeGreaterThanOrEqual(0);
      }
    });
  }
});
