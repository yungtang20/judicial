export interface TlrSearchResponse {
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function normalizeTaiwanCaseQuery(input: string): string {
  let clean = input.trim();
  if (clean.includes('judgment.judicial.gov.tw') || clean.includes('http://') || clean.includes('https://')) {
    try {
      const url = new URL(clean);
      const id = url.searchParams.get('id') || url.searchParams.get('jrecno') || url.searchParams.get('kw');
      if (id) clean = decodeURIComponent(id);
    } catch {
      // Keep the original query when URL parsing fails.
    }
  }
  if (clean.includes(',')) {
    const parts = clean.split(',');
    if (/^\d+$/.test(parts[0]) && parts.length >= 3) return `${parts[0]} ${parts[1]} ${parts[2]}`;
    if (parts.length >= 4) return `${parts[1]} ${parts[2]} ${parts[3]}`;
  }
  const match = clean.match(/(?:[\u4e00-\u9fa5]+院\s*)?(\d{1,3})\s*(?:年度|年)?\s*([\u4e00-\u9fa5()（）]+?)\s*(?:字第|第|字)?\s*(\d+)\s*號?/);
  if (match) return `${match[1]} ${match[2].replace(/^(?:年度|年)/, '').replace(/(?:字第|第|字)$/, '').trim()} ${match[3]}`;
  return clean;
}

export async function searchTlr(
  fetchImpl: typeof fetch,
  query: string,
  options: { searchType?: string; maxResults?: number } = {}
): Promise<TlrSearchResponse> {
  if (!query.trim()) throw new Error('No search query provided');
  const searchType = options.searchType || 'hybrid';
  const maxResults = options.maxResults || 5;
  const normalizedQuery = normalizeTaiwanCaseQuery(query);
  const request = (searchQuery: string) => fetchImpl('https://tlr.dr-legal.com.tw/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: searchQuery, search_type: searchType, max_results: maxResults })
  });
  const response = await request(normalizedQuery);
  if (!response.ok) throw new Error(`TLR API search error: ${response.status}`);
  let data = await response.json() as TlrSearchResponse;
  if ((!data.results || data.results.length === 0) && normalizedQuery !== query.trim()) {
    const fallbackResponse = await request(query.trim());
    if (fallbackResponse.ok) data = await fallbackResponse.json() as TlrSearchResponse;
  }
  return data;
}
