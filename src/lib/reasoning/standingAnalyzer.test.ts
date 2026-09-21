import { describe, expect, it } from 'vitest';
import { analyzeStanding } from './standingAnalyzer';

describe('standingAnalyzer', () => {
  it('separates the claimant from the eligible rights holder', () => {
    const result = analyzeStanding({ narrative: '催收通知', claimantPartyId: 'resident' }, [{ id: 'resident', role: '住戶' }], [{ id: 'privacy', legalBasis: '個資法', standingRequirement: '個資主體本人', positiveElements: ['通知'], evidenceRequirements: [] }]);
    expect(result[0]).toMatchObject({ status: 'SUBJECT_MISMATCH', eligiblePartyRoles: ['個資主體本人'] });
  });
});
