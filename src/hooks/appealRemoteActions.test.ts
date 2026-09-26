import { describe, expect, it, vi, afterEach } from 'vitest';
import { authenticateJudicial, fetchTlrFulltext, searchTlr } from './appealRemoteActions';

afterEach(() => vi.restoreAllMocks());

describe('appeal remote actions', () => {
  it('normalizes TLR search responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ doc_id: 'a', citation_text: '最高法院112年台上字第9號' }], note: 'ok' })
    }));

    const result = await searchTlr('112年台上字第9號', 'hybrid');
    expect(result.results[0]?.citation_text).toBe('最高法院112年台上字第9號');
    expect(result.note).toBe('ok');
  });

  it('returns fulltext and authentication tokens', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ fulltext: '裁判全文' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Token: 'token-1' }) }));

    await expect(fetchTlrFulltext({ doc_id: 'a' })).resolves.toMatchObject({ fulltext: '裁判全文' });
    await expect(authenticateJudicial('account', 'password')).resolves.toBe('token-1');
  });

  it('rejects failed API responses with the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: '來源拒絕' })
    }));

    await expect(searchTlr('查詢', 'hybrid')).rejects.toThrow('來源拒絕');
  });
});
