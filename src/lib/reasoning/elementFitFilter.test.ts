import { describe, expect, it } from 'vitest';
import { evaluateElementFit } from './elementFitFilter';

describe('elementFitFilter', () => {
  it('keeps a claim as insufficient instead of deleting it', () => {
    const claims = [{ id: 'c1', legalBasis: '測試', standingRequirement: '本人', positiveElements: ['A'], evidenceRequirements: ['原始紀錄'] }];
    const results = claims.map(claim => evaluateElementFit(claim, [{ element: 'A', status: '證據不足' }]));
    expect(results).toHaveLength(1);
    expect(results[0].claimId).toBe('c1');
    expect(results[0].status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
