import { describe, expect, it } from 'vitest';
import { assertCaseTransition, canTransitionCase } from './workflow';

describe('case workflow', () => {
  it('allows the legal case lifecycle and rejects stage skipping', () => {
    expect(canTransitionCase('INGEST', 'DEIDENTIFIED')).toBe(true);
    expect(canTransitionCase('ANALYZED', 'DRAFTED')).toBe(true);
    expect(canTransitionCase('INGEST', 'FINALIZED')).toBe(false);
    expect(() => assertCaseTransition('DRAFTED', 'FINALIZED')).toThrow('不得');
  });
});
