import { describe, expect, it, vi, afterEach } from 'vitest';
import { searchLegalSources, retrieveLegalContext } from './twLegalRagClient';

describe('tw-legal-rag source adapter', () => {
  afterEach(() => { delete process.env.TLR_ENABLED; delete process.env.TLR_BASE_URL; });

  it('does not call an external provider when disabled', async () => {
    delete process.env.TLR_ENABLED;
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
    expect(result.allowedCitations).toContain('最高法院112年度台上字第9號');
  });

  it('formats promptBlock and extracts allowed_citations in retrieveLegalContext when enabled', async () => {
    process.env.TLR_ENABLED = 'true';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        judgments: [{ citation_id: 'J1', citation_text: '最高法院112年度台上字第9號', fulltext_excerpt: '侵權責任之構成要件理由摘錄', citation_url: 'https://judgment.judicial.gov.tw/j1' }],
        allowed_citations: ['J1']
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ serial_no: '法務部法律字第1100351234號', title: '民法第184條適用函釋', excerpt: '侵權責任適用要件' }]
      }), { status: 200 }));

    const context = await retrieveLegalContext('侵權行為損害賠償', fetchMock);
    expect(context.hasCitations).toBe(true);
    expect(context.allowedCitations).toContain('最高法院112年度台上字第9號');
    expect(context.promptBlock).toContain('【相關實務見解與法規（僅供參考，引用前須核實原文）】');
    expect(context.promptBlock).toContain('最高法院112年度台上字第9號');
    expect(context.promptBlock).toContain('allowed_citations');
    expect(context.promptBlock).toContain('優先引用原則');
    expect(context.promptBlock).toContain('防幽靈引用限制');
  });

  it('provides safe fail-closed prompt block in retrieveLegalContext when disabled', async () => {
    const fetchMock = vi.fn();
    const context = await retrieveLegalContext('房屋買賣糾紛', fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(context.hasCitations).toBe(false);
    expect(context.promptBlock).toContain('【相關實務見解與法規（僅供參考，引用前須核實原文）】');
    expect(context.promptBlock).toContain('免責聲明');
    expect(context.promptBlock).toContain('嚴禁憑空捏造任何虛構裁判字號');
  });
});

