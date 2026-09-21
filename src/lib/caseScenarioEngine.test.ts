import { describe, expect, it } from 'vitest';
import { analyzeCaseScenario } from './caseScenarioEngine';

describe('caseScenarioEngine', () => {
  it('routes supported domains and recommends existing catalog IDs', () => {
    const result = analyzeCaseScenario({ domainId: 'DEBT_COLLECTION', facts: { narrative: '債務人欠款', isDebtorSelf: true }, parties: [] });
    expect(result.recommendedDocumentIds).toContain('PAYMENT_ORDER_PETITION');
  });
});
