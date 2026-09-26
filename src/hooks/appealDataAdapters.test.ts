import { describe, expect, it } from 'vitest';
import {
  mapRecommendedKeywords,
  mapSuggestedEvidences,
  mapSuggestedIssues,
  mapSuggestedPrecedents,
  parseAppealCaseNumber
} from './appealDataAdapters';

describe('appeal data adapters', () => {
  it('normalizes suggested issues and evidence into canonical row types', () => {
    expect(mapSuggestedIssues([{ title: '爭點', legalStrength: 'NEED_SUPPLEMENT' }])[0]).toMatchObject({
      title: '爭點',
      legalStrength: 'NEED_SUPPLEMENT'
    });
    expect(mapSuggestedEvidences([{ method: '函調', target: '銀行' }])[0]).toMatchObject({
      investigationItem: '函調',
      investigationTarget: '銀行'
    });
  });

  it('normalizes keywords, precedents and case number parts', () => {
    expect(mapRecommendedKeywords(['民法', '民事訴訟法'])).toBe('民法 民事訴訟法');
    expect(mapSuggestedPrecedents([{ citation: '最高法院112年度台上字第9號' }], 100)[0]).toMatchObject({
      id: 'p_auto_100_0',
      selected: true
    });
    expect(parseAppealCaseNumber('113年度訴字第1234號')).toEqual({ year: '113', word: '訴', number: '1234' });
  });
});
