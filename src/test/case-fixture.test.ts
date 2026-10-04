import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const fixturePath = path.join(process.cwd(), 'src/test/case-fixture.json');

describe('LINE case fixture', () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Array<{
    categoryHint: string;
    案由: string;
    發生時間: string | null;
    地點: string | null;
    損失金額: string | null;
    案情摘要: string | null;
  }>;

  it('has at least 10 cases', () => {
    expect(fixture.length).toBeGreaterThanOrEqual(10);
  });

  it('every case has a non-empty summary', () => {
    for (const c of fixture) {
      expect(c.案情摘要).toBeTruthy();
      expect(c.案情摘要!.length).toBeGreaterThan(20);
    }
  });

  it('covers a diverse set of legal categories', () => {
    const hints = new Set(fixture.map((c) => c.categoryHint));
    expect(hints.size).toBeGreaterThanOrEqual(10);
  });

  it('all summaries are strings (no mojibake gaps expected beyond reporter names)', () => {
    for (const c of fixture) {
      expect(typeof c.案情摘要).toBe('string');
    }
  });
});
