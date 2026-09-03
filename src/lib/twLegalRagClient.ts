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
  provider: 'tw-legal-rag' | 'unavailable' | 'local-index' | 'local-index-judgment' | 'local-index-hybrid';
  disclaimer: string;
  statutes: LegalSourceItem[];
  judgments: LegalSourceItem[];
  references: LegalSourceItem[];
  literature: LegalSourceItem[];
  allowedCitations?: string[];
}

export interface LegalPromptContext {
  sources: LegalSearchSources;
  promptBlock: string;
  allowedCitations: string[];
  disclaimer: string;
  hasCitations: boolean;
}

const DEFAULT_BASE_URL = 'https://tlr.dr-legal.com.tw';
const TIMEOUT_MS = 3_500;

const emptySources = (enabled: boolean): LegalSearchSources => ({
  enabled,
  provider: enabled ? 'tw-legal-rag' : 'unavailable',
  disclaimer: '檢索結果僅供查考；查無結果不代表法源不存在，引用前仍應閱讀原文及官方來源。',
  statutes: [], judgments: [], references: [], literature: [],
  allowedCitations: []
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

    // Extract allowed citations from payload and retrieved items
    const allowed = new Set<string>();
    if (Array.isArray(judgmentPayload?.allowed_citations)) {
      for (const item of judgmentPayload.allowed_citations) {
        if (typeof item === 'string' && item.trim()) {
          // If allowed_citations contains citation_id, find the matching item's citation text
          const matchedItem = sources.judgments.find((j: any) => j.citation === item || (judgmentPayload?.judgments?.find((raw: any) => raw.citation_id === item)?.citation_text === j.citation));
          if (matchedItem) {
            allowed.add(matchedItem.citation);
          } else {
            allowed.add(item.trim());
          }
        }
      }
    }
    // Also include explicitly whitelisted items
    for (const j of sources.judgments) {
      if (j.allowedCitation && j.citation) allowed.add(j.citation);
    }
    sources.allowedCitations = Array.from(allowed);

    // Statute search is kept separate from judgment/reference results. The
    // current hosted API may expose law lookup under a different version; do
    // not silently relabel a semantic result as an authoritative statute.
    return sources;
  } catch {
    return { ...emptySources(true), provider: 'unavailable', disclaimer: '目前無法連線外部法律檢索服務；本次導診仍可使用，引用請人工至官方來源確認。' };
  }
}

/**
 * Formats retrieved legal sources into the standard prompt injection block.
 */
export function formatLegalPromptBlock(sources: LegalSearchSources, allowedCitations: string[]): string {
  const lines: string[] = [];
  lines.push("【相關實務見解與法規（僅供參考，引用前須核實原文）】");
  lines.push(`免責聲明：${sources.disclaimer}`);

  if (sources.judgments && sources.judgments.length > 0) {
    lines.push("- 裁判：");
    for (const j of sources.judgments) {
      const excerpt = j.excerpt ? `：${j.excerpt.replace(/\s+/g, ' ').slice(0, 160)}...` : '';
      const url = j.sourceUrl ? ` (來源: ${j.sourceUrl})` : '';
      lines.push(`  * [${j.citation}]${excerpt}${url}`);
    }
  } else {
    lines.push("- 裁判：無檢索結果或檢索未啟用");
  }

  if (sources.references && sources.references.length > 0) {
    lines.push("- 函釋／法規：");
    for (const r of sources.references) {
      const excerpt = r.excerpt ? `：${r.excerpt.replace(/\s+/g, ' ').slice(0, 160)}...` : '';
      const url = r.sourceUrl ? ` (來源: ${r.sourceUrl})` : '';
      lines.push(`  * [${r.citation}] ${r.title}${excerpt}${url}`);
    }
  } else if (sources.statutes && sources.statutes.length > 0) {
    lines.push("- 法規條文：");
    for (const s of sources.statutes) {
      const excerpt = s.excerpt ? `：${s.excerpt.replace(/\s+/g, ' ').slice(0, 160)}...` : '';
      lines.push(`  * [${s.citation}] ${s.title}${excerpt}`);
    }
  } else {
    lines.push("- 函釋／法規：無檢索結果或檢索未啟用");
  }

  lines.push("- 允許引用的 citation 列表（allowed_citations）：");
  if (allowedCitations.length > 0) {
    for (const c of allowedCitations) {
      lines.push(`  * ${c}`);
    }
  } else {
    lines.push("  * （本次無外部檢索來源，僅允許引用中華民國現行有效實體與程序法條，嚴禁憑空捏造任何虛構裁判字號或案號）");
  }

  lines.push("");
  lines.push("【實務見解與法規引用規範】");
  lines.push("1. 優先引用原則：若需援引司法裁判或實務見解，必須優先且僅能引用上述 allowed_citations 中列出之來源，並於文中標註來源案號。");
  lines.push("2. 防幽靈引用限制：嚴禁在文中創造或引用未列於 allowed_citations 的虛構判決案號。若無對應實務見解，請直接依實定法構成要件進行論述，不得假造裁判支持。");

  return lines.join("\n");
}

/**
 * Shared retrieval function for all legal analysis and document generation routes.
 * Retrieves authoritative sources and formats the prompt injection block with allowed_citations.
 */
export async function retrieveLegalContext(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<LegalPromptContext> {
  const sources = await searchLegalSources(query, fetchImpl);

  const allowedSet = new Set<string>();

  // 1. Collect from sources.allowedCitations
  if (Array.isArray(sources.allowedCitations)) {
    for (const c of sources.allowedCitations) {
      if (c && typeof c === 'string') allowedSet.add(c.trim());
    }
  }

  // 2. Collect from judgments, references, statutes
  for (const j of sources.judgments) {
    if (j.citation && j.citation !== '未命名來源') {
      allowedSet.add(j.citation.trim());
    }
  }
  for (const r of sources.references) {
    if (r.citation && r.citation !== '未命名來源') {
      allowedSet.add(r.citation.trim());
    }
  }
  for (const s of sources.statutes) {
    if (s.citation && s.citation !== '未命名來源') {
      allowedSet.add(s.citation.trim());
    }
  }

  const allowedCitations = Array.from(allowedSet);
  const promptBlock = formatLegalPromptBlock(sources, allowedCitations);

  return {
    sources,
    promptBlock,
    allowedCitations,
    disclaimer: sources.disclaimer,
    hasCitations: allowedCitations.length > 0
  };
}

