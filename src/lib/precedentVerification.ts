export interface PrecedentCandidate {
  citation?: string;
  [key: string]: unknown;
}

export interface TlrSearchResponse {
  results?: Array<{ citation_text?: string; [key: string]: unknown }>;
}

export type TlrSearch = (query: string) => Promise<TlrSearchResponse>;

function normalizeCitation(value: string): string {
  return value.replace(/[\s\u3000，。,:：；;、()（）「」『』【】\[\]]/g, '').toLowerCase();
}

function citationIsVerified(candidate: string, result: { citation_text?: string }): boolean {
  const expected = normalizeCitation(candidate);
  const actual = normalizeCitation(result.citation_text || '');
  return Boolean(expected && actual && (actual.includes(expected) || expected.includes(actual)));
}

export async function verifyPrecedents(
  precedents: PrecedentCandidate[],
  searchTlr: TlrSearch
): Promise<PrecedentCandidate[]> {
  const verified: PrecedentCandidate[] = [];
  for (const precedent of precedents) {
    const citation = typeof precedent.citation === 'string' ? precedent.citation.trim() : '';
    if (!citation) continue;
    const searchResult = await searchTlr(citation);
    if ((searchResult.results || []).some((result) => citationIsVerified(citation, result))) {
      verified.push(precedent);
    }
  }
  return verified;
}

export function buildPrecedentFallback(_error?: unknown) {
  return {
    precedents: [],
    isFallback: true,
    warning: 'AI 搜尋暫時無法取得可信判例，請自行查證'
  };
}
