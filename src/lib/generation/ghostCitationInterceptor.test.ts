import { describe, expect, it } from 'vitest';
import { createMcpCitationRegistry } from '../mcp/mcpCitationRegistry';
import { GhostCitationError, interceptGhostCitations, interceptVerifiedCitationResults } from './ghostCitationInterceptor';

describe('ghostCitationInterceptor', () => {
  it('blocks citations outside the registry', () => {
    expect(() => interceptGhostCitations(['missing'], createMcpCitationRegistry()))
      .toThrowError(new GhostCitationError('GHOST_CITATION_BLOCKED', 'missing'));
  });

  it('blocks amended and repealed laws', () => {
    const registry = createMcpCitationRegistry([{
      id: 'old-law', kind: 'LAW', lawName: '民法', articleNumber: '1',
      currentStatus: 'AMENDED', sourceUrl: 'https://law.moj.gov.tw/'
    }]);
    expect(() => interceptGhostCitations(['old-law'], registry)).toThrow('INVALID_LAW_CITATION_BLOCKED');
  });

  it('blocks an unverified generated citation result before delivery', () => {
    expect(() => interceptVerifiedCitationResults([{
      citationText: '民法第999條', verified: false, isGhostOrFake: true
    } as any])).toThrow('GHOST_CITATION_BLOCKED');
  });
});
