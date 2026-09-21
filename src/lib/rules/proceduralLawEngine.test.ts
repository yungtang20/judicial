import { describe, expect, it } from 'vitest';
import { assessProceduralRequirements } from './proceduralLawEngine';

describe('proceduralLawEngine', () => {
  it('keeps incomplete deadline input unknown', () => {
    expect(assessProceduralRequirements('CIVIL').deadline.status).toBe('UNKNOWN');
  });
});
