/**
 * taiwanLegalDbClient 介面測試
 * 目前為未串接狀態：確認預設回 unavailable、去重與批次上限行為正確，
 * 且不模擬任何真實回應（fail-closed）。
 */
import { describe, expect, it } from 'vitest';
import {
  queryTaiwanLegalDb,
  queryTaiwanLegalDbBatch,
  DEFAULT_KINDS
} from './taiwanLegalDbClient';

describe('taiwanLegalDbClient', () => {
  it('未串接前一律回 unavailable，不模擬結果', async () => {
    const result = await queryTaiwanLegalDb({ query: '最高法院108年度台上字第2027號' });
    expect(result).toMatchObject({
      status: 'unavailable',
      source: 'mcp-taiwan-legal-db'
    });
    expect(result.message).toContain('尚未串接');
    expect(result.rawSummary).toBeUndefined();
  });

  it('批次去重、過濾空白、上限 20（與 dr-lawbot 對齊）', async () => {
    const queries = Array.from({ length: 22 }, (_, i) => ({
      query: `最高法院108年度台上字第${i + 1}號`
    }));
    queries.push({ query: '  最高法院108年度台上字第1號  ' }); // 去重
    queries.push({ query: '   ' }); // 過濾空白
    const results = await queryTaiwanLegalDbBatch(queries);
    expect(results).toHaveLength(20);
    expect(results[0]?.citation).toBe('最高法院108年度台上字第1號');
  });

  it('預設 kinds 為三類官方來源', () => {
    expect(DEFAULT_KINDS).toEqual(['judgment', 'statute', 'constitutional']);
  });
});
