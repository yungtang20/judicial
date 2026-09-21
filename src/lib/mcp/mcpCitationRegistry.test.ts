import { describe, expect, it } from 'vitest';
import { createMcpCitationRegistry } from './mcpCitationRegistry';

describe('McpCitationRegistry', () => {
  it('registers only complete structured citations', () => {
    const registry = createMcpCitationRegistry([{
      id: 'law-184', kind: 'LAW', lawName: '民法', articleNumber: '184',
      currentStatus: 'EFFECTIVE', sourceUrl: 'https://law.moj.gov.tw/'
    }]);
    expect(registry.get('law-184')).toMatchObject({ lawName: '民法', currentStatus: 'EFFECTIVE' });
  });

  it('requires a source hash for judgments', () => {
    expect(() => createMcpCitationRegistry([{
      id: 'judgment-1', kind: 'JUDGMENT', caseNumber: '112年度台上字第1號',
      court: '最高法院', judgmentDate: '2023-01-01', sourceUrl: 'https://judgment.judicial.gov.tw/', sourceHash: ''
    }])).toThrow('citation.sourceHash');
  });
});
