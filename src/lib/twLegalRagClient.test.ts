import { describe, expect, it, vi, afterEach } from 'vitest';
import { searchLegalSources } from './twLegalRagClient';

describe('tw-legal-rag source adapter', () => {
  afterEach(() => { delete process.env.TLR_ENABLED; delete process.env.TLR_BASE_URL; });

  it('does not call an external provider when disabled', async () => {
    const fetchMock = vi.fn();
    const result = await searchLegalSources('車禍求償', fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.enabled).toBe(false);
  });

  it('keeps judgment and reference results separated and preserves citation whitelist', async () => {
    process.env.TLR_ENABLED = 'true';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ judgments: [{ citation_id: 'J1', citation_text: '最高法院112年度台上字第9號', fulltext_excerpt: '理由摘錄', citation_url: 'https://example.test/j1' }], allowed_citations: ['J1'] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ serial_no: '台財稅第1號', title: '函釋', status: 'unknown', excerpt: '函釋內容' }] }), { status: 200 }));
    const result = await searchLegalSources('車禍求償', fetchMock);
    expect(result.judgments[0]?.allowedCitation).toBe(true);
    expect(result.references[0]?.status).toBe('unknown');
    expect(result.statutes).toHaveLength(0);
  });
});

