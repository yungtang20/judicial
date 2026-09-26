import { describe, expect, it } from 'vitest';
import { cosineSimilarity, extractRelevantExcerpt, tokenizeLegalText } from './retrievalMath';

describe('shared retrieval math', () => {
  it('computes cosine similarity with safe invalid-input behavior', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
  });

  it('creates stable CJK and alphanumeric tokens', () => {
    expect(tokenizeLegalText('民法第184條')).toEqual(expect.arrayContaining(['民法', '民法第184條', '法第']));
  });

  it('extracts an excerpt around the first matching token', () => {
    const text = `${'前'.repeat(80)}重要民法第184條${'後'.repeat(80)}`;
    const excerpt = extractRelevantExcerpt(text, '民法第184條', 40, 10);
    expect(excerpt).toContain('民法第184條');
    expect(excerpt.length).toBeLessThanOrEqual(42);
  });
});
