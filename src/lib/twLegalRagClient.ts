export type LegalSourceKind = 'statutes' | 'judgments' | 'references' | 'literature';

export interface LegalSourceItem {
  kind: LegalSourceKind;
  citation: string;
  title: string;
  excerpt?: string;
  sourceUrl?: string;
  status?: string;
  allowedCitation?: boolean;
  caseHistory?: unknown;
}

export interface LegalSearchSources {
  enabled: boolean;
  provider: 'tw-legal-rag' | 'unavailable' | 'local-index';
  disclaimer: string;
  statutes: LegalSourceItem[];
  judgments: LegalSourceItem[];
  references: LegalSourceItem[];
  literature: LegalSourceItem[];
}

const DEFAULT_BASE_URL = 'https://tlr.dr-legal.com.tw';
const TIMEOUT_MS = 3_500;

const emptySources = (enabled: boolean): LegalSearchSources => ({
  enabled,
  provider: enabled ? 'tw-legal-rag' : 'unavailable',
  disclaimer: '檢索結果僅供查考；查無結果不代表法源不存在，引用前仍應閱讀原文及官方來源。',
  statutes: [], judgments: [], references: [], literature: []
});

const requestJson = async (url: string, body: unknown, fetchImpl: typeof fetch): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const asItems = (kind: LegalSourceKind, payload: any): LegalSourceItem[] => {
  const rows = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload?.judgments) ? payload.judgments : Array.isArray(payload?.matches) ? payload.matches : [];
  return rows.slice(0, 10).map((row: any) => ({
    kind,
    citation: String(row.citation || row.citation_text || row.serial_no || row.case_number || row.title || '未命名來源'),
    title: String(row.title || row.citation_text || row.serial_no || row.case_number || '法律資料'),
    excerpt: row.excerpt || row.fulltext_excerpt || row.hit_excerpt || row.fulltext,
    sourceUrl: row.source_url || row.citation_url,
    status: row.status,
    allowedCitation: payload?.allowed_citations?.includes?.(row.citation_id) || false,
    caseHistory: row.case_history
  }));
};

export async function searchLegalSources(query: string, fetchImpl: typeof fetch = fetch): Promise<LegalSearchSources> {
  const enabled = process.env.TLR_ENABLED === 'true';
  const sources = emptySources(enabled);
  if (!enabled || !query.trim()) return sources;
  const baseUrl = process.env.TLR_BASE_URL || DEFAULT_BASE_URL;
  try {
    const [judgmentPayload, referencePayload] = await Promise.all([
      requestJson(`${baseUrl}/v1/search`, { query, max_results: 5, read_top: 5 }, fetchImpl),
      requestJson(`${baseUrl}/v1/legal_references/search`, { query, max_results: 5 }, fetchImpl)
    ]);
    sources.judgments = asItems('judgments', judgmentPayload);
    sources.references = asItems('references', referencePayload);
    // Statute search is kept separate from judgment/reference results. The
    // current hosted API may expose law lookup under a different version; do
    // not silently relabel a semantic result as an authoritative statute.
    return sources;
  } catch {
    return { ...emptySources(true), provider: 'unavailable', disclaimer: '目前無法連線外部法律檢索服務；本次導診仍可使用，引用請人工至官方來源確認。' };
  }
}

