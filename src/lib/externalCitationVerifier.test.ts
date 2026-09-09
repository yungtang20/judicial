import { describe, expect, it, vi } from 'vitest';
import { parsePrecedentCitation, verifyExternalPrecedent, verifyExternalPrecedents } from './externalCitationVerifier';

describe('external citation verifier', () => {
  it('parses structured Taiwan precedent citations', () => {
    expect(parsePrecedentCitation('最高法院 108 年度台上字第 2027 號民事判決')).toEqual({ year: '108', caseWord: '台上', caseNum: '2027' });
    expect(parsePrecedentCitation('最高法院１０８年度台上字第２０２７號')).toEqual({ year: '108', caseWord: '台上', caseNum: '2027' });
    expect(parsePrecedentCitation('這不是裁判字號')).toBeNull();
  });

  it('fails closed when the citation cannot be parsed without calling the service', async () => {
    const fetchMock = vi.fn();
    const result = await verifyExternalPrecedent('無法解析的引用', fetchMock);
    expect(result).toMatchObject({ status: 'unknown', exactMatch: false, source: 'dr-lawbot' });
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('fails closed on non-success and malformed service responses', async () => {
    const httpError = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    await expect(verifyExternalPrecedent('最高法院108年度台上字第2027號', httpError))
      .resolves.toMatchObject({ status: 'unknown', exactMatch: false });

    const malformed = vi.fn().mockResolvedValue(new Response('{not-json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    await expect(verifyExternalPrecedent('最高法院108年度台上字第2027號', malformed))
      .resolves.toMatchObject({ status: 'unknown', exactMatch: false });
  });

  it('distinguishes a current not-found result from an out-of-coverage result', async () => {
    const emptyResults = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }));
    await expect(verifyExternalPrecedent('最高法院108年度台上字第2027號', emptyResults))
      .resolves.toMatchObject({ status: 'not_found', exactMatch: false });
    await expect(verifyExternalPrecedent('最高法院99年度台上字第2027號', emptyResults))
      .resolves.toMatchObject({ status: 'out_of_coverage', exactMatch: false });
  });

  it('deduplicates, trims, removes blanks, and caps batch queries at twenty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    const citations = Array.from({ length: 22 }, (_, index) => `最高法院108年度台上字第${index + 1}號`);
    citations.push(' 最高法院108年度台上字第1號 ', '   ');

    const results = await verifyExternalPrecedents(citations, fetchMock);

    expect(results).toHaveLength(20);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(results[0].citation).toBe('最高法院108年度台上字第1號');
  });
});
