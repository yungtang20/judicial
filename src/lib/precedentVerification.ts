export interface PrecedentCandidate {
  citation?: string;
  [key: string]: unknown;
}

export interface TlrSearchResponse {
  results?: Array<{ citation_text?: string; [key: string]: unknown }>;
}

export type TlrSearch = (query: string) => Promise<TlrSearchResponse>;

export function normalizeCitation(value: string): string {
  return value.replace(/[\s\u3000，。,:：；;、()（）「」『』【】\[\]]/g, '').toLowerCase();
}

function citationIdentity(value: string): string | null {
  const normalized = normalizeCitation(value);
  const match = normalized.match(/(?:(最高法院|臺灣[^\d]{1,20}法院|台灣[^\d]{1,20}法院))?(\d{2,3})(?:年度|年)([台臺][^字第]{0,8})(?:字第|第)(\d+)號?/);
  if (!match) return null;
  return `${match[1] || ''}|${match[2]}|${match[3].replace(/字$/, '')}|${match[4]}`;
}

function citationIsVerified(candidate: string, result: { citation_text?: string }): boolean {
  const expectedIdentity = citationIdentity(candidate);
  const actualIdentity = citationIdentity(result.citation_text || '');
  return Boolean(expectedIdentity && actualIdentity && expectedIdentity === actualIdentity);
}

export async function verifyPrecedents(
  precedents: PrecedentCandidate[] | unknown,
  searchTlr: TlrSearch
): Promise<PrecedentCandidate[]> {
  if (!Array.isArray(precedents)) return [];
  const checks = precedents.map(async (precedent) => {
    const citation = typeof precedent.citation === 'string' ? precedent.citation.trim() : '';
    if (!citation) return null;
    const searchResult = await searchTlr(citation);
    if (!Array.isArray(searchResult.results)) return null;
    return searchResult.results.some((result) => citationIsVerified(citation, result)) ? precedent : null;
  });
  const settled = await Promise.allSettled(checks);
  return settled.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
}

export function buildPrecedentFallback(_error?: unknown) {
  return {
    precedents: [],
    isFallback: true,
    warning: 'AI 搜尋暫時無法取得可信判例，請自行查證'
  };
}
