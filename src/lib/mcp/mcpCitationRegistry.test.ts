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

  // 每個欄位的非空檢查都必須各自有測試保護。
  // 先前只測了 sourceHash 一個欄位，其餘九個檢查就算被移除也不會有任何測試失敗。
  const 完整法條 = {
    id: 'law-184', kind: 'LAW' as const, lawName: '民法', articleNumber: '184',
    currentStatus: 'EFFECTIVE', sourceUrl: 'https://law.moj.gov.tw/'
  };
  const 完整裁判 = {
    id: 'judgment-1', kind: 'JUDGMENT' as const, caseNumber: '112年度台上字第1號',
    court: '最高法院', judgmentDate: '2023-01-01',
    sourceUrl: 'https://judgment.judicial.gov.tw/', sourceHash: 'a'.repeat(64)
  };

  it.each([
    ['id', 完整法條, 'id', 'law-184'],
    ['sourceUrl', 完整法條, 'sourceUrl', 'https://law.moj.gov.tw/'],
    ['lawName', 完整法條, 'lawName', '民法'],
    ['articleNumber', 完整法條, 'articleNumber', '184'],
    ['currentStatus', 完整法條, 'currentStatus', 'EFFECTIVE'],
    ['caseNumber', 完整裁判, 'caseNumber', '112年度台上字第1號'],
    ['court', 完整裁判, 'court', '最高法院'],
    ['judgmentDate', 完整裁判, 'judgmentDate', '2023-01-01'],
    ['sourceHash', 完整裁判, 'sourceHash', 'a'.repeat(64)]
  ] as const)('rejects a citation whose %s is empty', (_名, 樣本, 欄位, 欄位值) => {
    expect(() => createMcpCitationRegistry([
      { ...樣本, [欄位]: '' } as never
    ])).toThrow(`citation.${欄位}`);
    // 空白字串同樣視為未提供
    expect(() => createMcpCitationRegistry([
      { ...樣本, [欄位]: '   ' } as never
    ])).toThrow(`citation.${欄位}`);
    expect(欄位值.length).toBeGreaterThan(0);
  });

  it('accepts a complete judgment citation', () => {
    expect(() => createMcpCitationRegistry([完整裁判])).not.toThrow();
  });
});
