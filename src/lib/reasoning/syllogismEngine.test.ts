import { describe, expect, it } from 'vitest';
import { buildSyllogismResult } from './syllogismEngine';

describe('syllogismEngine', () => {
  it('marks a fully structured result valid only with MCP citations', () => {
    expect(buildSyllogismResult({
      majorPremise: '民法第184條構成要件', minorPremise: '使用者提供的事實與證據',
      conclusion: '目前可進行要件涵攝', mcpCitationIds: ['law-184']
    }).valid).toBe(true);
  });

  it('fails closed when a required field or citation is missing', () => {
    expect(buildSyllogismResult({ majorPremise: '', minorPremise: '事實', conclusion: '結論', mcpCitationIds: [] }).valid).toBe(false);
  });
});
