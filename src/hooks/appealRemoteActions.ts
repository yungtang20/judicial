import { fetchWithAuth } from '../lib/apiClient';

export type TlrSearchResult = {
  doc_id?: string;
  citation_text?: string;
  result_token?: string;
  source_url?: string;
  court_name?: string;
  hit_excerpt?: string;
  [key: string]: unknown;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('遠端服務回應格式無效');
  }
  if (!response.ok) {
    const record = asRecord(data);
    throw new Error(text(record.error) || `HTTP ${response.status}`);
  }
  return data;
}

export async function searchTlr(query: string, searchType: string): Promise<{ results: TlrSearchResult[]; note?: string }> {
  const data = asRecord(await postJson('/api/tlr/search', {
    query,
    search_type: searchType,
    max_results: 6
  }));
  const results = Array.isArray(data.results)
    ? data.results.filter((item): item is TlrSearchResult => typeof item === 'object' && item !== null)
    : [];
  return { results, note: text(data.note) || undefined };
}

export async function fetchTlrFulltext(item: TlrSearchResult): Promise<{ fulltext: string; sourceUrl?: string }> {
  const data = asRecord(await postJson('/api/tlr/fulltext', {
    doc_id: item.doc_id,
    result_token: item.result_token
  }));
  return {
    fulltext: text(data.fulltext) || text(data.text_excerpt),
    sourceUrl: text(data.source_url) || item.source_url
  };
}

export async function authenticateJudicial(account: string, password: string): Promise<string> {
  const data = asRecord(await postJson('/api/judicial/jdg/auth', { user: account, password }));
  const token = text(data.Token);
  if (!token) throw new Error(text(data.error) || '司法院 API 驗證未回傳 Token');
  return token;
}

export async function fetchJudicialJDoc(token: string, jid: string): Promise<{ content: string }> {
  const data = await postJson('/api/judicial/jdg/jdoc', { token, j: jid });
  if (typeof data === 'string') return { content: data };
  const record = asRecord(data);
  if (text(record.error)) throw new Error(text(record.error));
  const jfull = asRecord(record.JFULLX);
  return { content: text(jfull.JFULLCONTENT) || JSON.stringify(data, null, 2) };
}

export async function fetchJudicialJList(token: string): Promise<Array<{ date: string; list: string[] }>> {
  const data = await postJson('/api/judicial/jdg/jlist', { token });
  if (!Array.isArray(data)) throw new Error('司法院 API 未回傳有效的裁判書異動清單');
  return data.flatMap(item => {
    const record = asRecord(item);
    const list = Array.isArray(record.list) ? record.list.filter((entry): entry is string => typeof entry === 'string') : [];
    return [{ date: text(record.date), list }];
  });
}
