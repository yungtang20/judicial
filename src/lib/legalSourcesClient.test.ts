/**
 * legalSourcesClient 統一入口測試
 * 重點：兩邊獨立——dr-lawbot 失敗不影響 mcp-taiwan-legal-db 回傳，反之亦然。
 * 目前 mcp-taiwan-legal-db 未串接，預設回 unavailable；不模擬真實回應。
 */
import { describe, expect, it, vi } from 'vitest';
import { queryAllLegalSources } from './legalSourcesClient';
import { verifyExternalPrecedents } from './externalCitationVerifier';

// 只 mock dr-lawbot 端；mcp-taiwan-legal-db 走真實介面（未串接=unavailable）
vi.mock('./externalCitationVerifier', () => ({
  verifyExternalPrecedents: vi.fn()
}));

describe('queryAllLegalSources', () => {
  it('正常查到：兩邊各回傳各自結果，原始不合併', async () => {
    (verifyExternalPrecedents as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        citation: '最高法院108年度台上字第2027號',
        status: 'verified',
        exactMatch: true,
        source: 'dr-lawbot',
        message: 'mock',
        searchUrl: 'mock'
      }
    ]);

    const result = await queryAllLegalSources(['最高法院108年度台上字第2027號']);

    expect(result.drLawbot[0]?.status).toBe('verified');
    expect(result.taiwanLegalDb[0]?.source).toBe('mcp-taiwan-legal-db');
    // 未串接：第二邊獨立回 unavailable，不影響 dr-lawbot 的 verified
    expect(result.taiwanLegalDb[0]?.status).toBe('unavailable');
    expect(result.queries).toEqual(['最高法院108年度台上字第2027號']);
  });

  it('dr-lawbot 失敗（unknown）時 mcp-taiwan-legal-db 仍獨立回傳', async () => {
    (verifyExternalPrecedents as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        citation: '最高法院108年度台上字第2027號',
        status: 'unknown',
        exactMatch: false,
        source: 'dr-lawbot',
        message: 'external query failed',
        searchUrl: 'mock'
      }
    ]);

    const result = await queryAllLegalSources(['最高法院108年度台上字第2027號']);
    expect(result.drLawbot[0]?.status).toBe('unknown');
    // 第二邊不跟著掛：仍回 unavailable（未串接），而非 dr-lawbot 的錯誤
    expect(result.taiwanLegalDb[0]?.status).toBe('unavailable');
  });

  it('過濾空白引用，空輸入不爆炸', async () => {
    (verifyExternalPrecedents as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const result = await queryAllLegalSources(['   ', '', '  ']);
    expect(result.queries).toEqual([]);
    expect(result.drLawbot).toEqual([]);
    expect(result.taiwanLegalDb).toEqual([]);
  });
});
