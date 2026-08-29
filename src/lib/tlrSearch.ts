export interface TlrSearchResponse {
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
import { normalizeTaiwanCaseQuery } from './caseQuery.js';

export { normalizeTaiwanCaseQuery };

export class TlrSearchError extends Error {
  constructor(public readonly code: 'TLR_TIMEOUT' | 'TLR_UPSTREAM_ERROR' | 'TLR_INVALID_RESPONSE', message: string) {
    super(message);
    this.name = 'TlrSearchError';
  }
}

export async function searchTlr(
  fetchImpl: typeof fetch,
  query: string,
  options: { searchType?: string; maxResults?: number; timeoutMs?: number } = {}
): Promise<TlrSearchResponse> {
  if (!query.trim()) throw new Error('No search query provided');
  const searchType = options.searchType || 'hybrid';
  const maxResults = options.maxResults || 5;
  const timeoutMs = options.timeoutMs ?? 8000;
  const normalizedQuery = normalizeTaiwanCaseQuery(query);
  const request = (searchQuery: string) => fetchImpl('https://tlr.dr-legal.com.tw/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: searchQuery, search_type: searchType, max_results: maxResults })
  });
  const fetchWithTimeout = async (searchQuery: string) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        request(searchQuery),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new TlrSearchError('TLR_TIMEOUT', `TLR API timeout after ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const parseResponse = async (response: Response): Promise<TlrSearchResponse> => {
    if (!response.ok) throw new TlrSearchError('TLR_UPSTREAM_ERROR', `TLR API search error: ${response.status}`);
    const data = await response.json() as TlrSearchResponse;
    if (!data || !Array.isArray(data.results)) {
      throw new TlrSearchError('TLR_INVALID_RESPONSE', 'TLR API returned an invalid response shape');
    }
    return data;
  };
  const response = await fetchWithTimeout(normalizedQuery);
  let data = await parseResponse(response);
  if ((!data.results || data.results.length === 0) && normalizedQuery !== query.trim()) {
    const fallbackResponse = await fetchWithTimeout(query.trim());
    if (fallbackResponse.ok) data = await parseResponse(fallbackResponse);
  }
  return data;
}
