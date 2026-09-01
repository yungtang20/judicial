import { describe, expect, it, vi } from 'vitest';
import { parsePrecedentCitation, verifyExternalPrecedent } from './externalCitationVerifier';

describe('external citation verifier', () => {
  it('parses structured Taiwan precedent citations', () => {
    expect(parsePrecedentCitation('最高法院 108 年度台上字第 2027 號民事判決')).toEqual({ year: '108', caseWord: '台上', caseNum: '2027' });
  });

  it('requires an exact tuple match and labels positive results as cross-check only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ jyear: 108, jcase: '台上', jno: 2027 }] }), { status: 200 }));
    const result = await verifyExternalPrecedent('最高法院108年度台上字第2027號民事判決', fetchMock);
    expect(result.status).toBe('verified');
    expect(result.exactMatch).toBe(true);
    expect(result.message).toContain('不代表');
  });

  it('fails closed to unknown on API errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await verifyExternalPrecedent('最高法院108年度台上字第2027號民事判決', fetchMock);
    expect(result.status).toBe('unknown');
    expect(result.exactMatch).toBe(false);
  });
});

