/**
 * Optional cross-check for external precedent citations.
 *
 * This is an enrichment source only: a positive result means that dr-lawbot
 * returned an exact year/case-word/number tuple, not that the cited holding is
 * correct or that the source is an official government verification.
 */
export type ExternalCitationStatus = 'verified' | 'not_found' | 'unknown' | 'out_of_coverage';

export interface ExternalCitationResult {
  citation: string;
  status: ExternalCitationStatus;
  exactMatch: boolean;
  source: 'dr-lawbot';
  message: string;
  searchUrl: string;
}

const API_URL = 'https://api.dr-lawbot.com/api/search';
const TIMEOUT_MS = 8_000;
const MAX_BATCH_SIZE = 20;

const toAsciiDigits = (value: string) => value.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));

export function parsePrecedentCitation(citation: string): { year: string; caseWord: string; caseNum: string } | null {
  const normalized = toAsciiDigits(citation).replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(\d+)\s*年(?:度)?\s*([^\d\s]+?)\s*字?\s*第\s*(\d+)\s*號/);
  if (!match) return null;
  return { year: match[1], caseWord: match[2].replace(/字$/, ''), caseNum: match[3] };
}

export async function verifyExternalPrecedent(
  citation: string,
  fetchImpl: typeof fetch = fetch
): Promise<ExternalCitationResult> {
  const searchUrl = `${API_URL}?q=${encodeURIComponent(citation)}`;
  const parsed = parsePrecedentCitation(citation);
  if (!parsed) {
    return { citation, status: 'unknown', exactMatch: false, source: 'dr-lawbot', message: '輸入未能解析為結構化裁判字號，請人工核對。', searchUrl };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(searchUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    const results = Array.isArray(payload.results) ? payload.results : [];
    if (results.some((result) => String(result.jyear) === parsed.year && String(result.jcase ?? '').replace(/字$/, '') === parsed.caseWord && String(result.jno) === parsed.caseNum)) {
      return { citation, status: 'verified', exactMatch: true, source: 'dr-lawbot', message: '外部資料庫回傳完全吻合字號；仍不代表引用內容或官方效力已獲核實。', searchUrl };
    }
    return {
      citation,
      status: parsed.year.localeCompare('100', undefined, { numeric: true }) < 0 ? 'out_of_coverage' : 'not_found',
      exactMatch: false,
      source: 'dr-lawbot',
      message: parsed.year.localeCompare('100', undefined, { numeric: true }) < 0 ? '該外部資料庫主要收錄民國100年起資料，無法據此判定裁判不存在。' : '外部資料庫未回傳完全吻合字號，請至官方裁判書系統人工核對。',
      searchUrl
    };
  } catch {
    return { citation, status: 'unknown', exactMatch: false, source: 'dr-lawbot', message: '外部查詢失敗或逾時，未據此判定裁判真偽。', searchUrl };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyExternalPrecedents(
  citations: string[],
  fetchImpl: typeof fetch = fetch
): Promise<ExternalCitationResult[]> {
  const unique = [...new Set(citations.map((citation) => citation.trim()).filter(Boolean))].slice(0, MAX_BATCH_SIZE);
  return Promise.all(unique.map((citation) => verifyExternalPrecedent(citation, fetchImpl)));
}

