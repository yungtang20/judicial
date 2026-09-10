import * as cheerio from "cheerio";

export type OfficialEvidenceStatus = "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE";
export type OfficialCitationType = "STATUTE" | "PRECEDENT";

export interface OfficialCitationInput {
  citation: string;
  type: OfficialCitationType;
  claim?: string;
}

export interface OfficialEvidence {
  citation: string;
  type: OfficialCitationType;
  status: OfficialEvidenceStatus;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  query: string;
  matchStrategy: string;
  contentHash?: string;
  snippet?: string;
  claimSupportStatus?: "SUPPORTED" | "NEEDS_REVIEW" | "UNVERIFIABLE";
  error?: string;
}

export interface OfficialVerificationSummary {
  evidence: OfficialEvidence[];
  allVerified: boolean;
  attempted: boolean;
  reason?: string;
}

export interface OfficialVerificationOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResults?: number;
}

export interface OfficialJudgmentSearchResult {
  caseNumber: string;
  courtName: string;
  summary: string;
  sourceUrl: string;
  checkedAt: string;
  contentHash: string;
}

export interface OfficialJudgmentSearchSummary {
  results: OfficialJudgmentSearchResult[];
  status: OfficialEvidenceStatus;
  attempted: boolean;
  query: string;
  source: "司法院裁判書系統";
  sourceUrl: string;
  checkedAt: string;
  error?: string;
}

const LAW_ORIGIN = "https://law.moj.gov.tw";
const JUDGMENT_ORIGIN = "https://judgment.judicial.gov.tw";
const JUDGMENT_BASE = `${JUDGMENT_ORIGIN}/FJUD/`;
const JUDGMENT_SEARCH = `${JUDGMENT_BASE}default.aspx`;
const USER_AGENT = "Mozilla/5.0 (compatible; JudicialLegalVerifier/1.0)";

// 僅列定義官方條文頁的路由，不把本機內容當成官方查證結果。
const STATUTE_PCODES: Readonly<Record<string, string>> = Object.freeze({
  "民法": "B0000001",
  "民事訴訟法": "B0010001",
  "刑法": "C0000001",
  "刑事訴訟法": "C0010001",
  "家庭暴力防治法": "D0050071",
  "洗錢防制法": "G0380131",
  "票據法": "G0380028",
  "勞動基準法": "N0030001"
});

const normalize = (value: string) => value
  .replace(/[\s　]/g, "")
  .replace(/[０-９]/g, character => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
  .replace(/臺/g, "台");

const textFromHtml = (html: string) => cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();

function assessClaimSupport(claim: string | undefined, officialText: string): "SUPPORTED" | "NEEDS_REVIEW" | "UNVERIFIABLE" {
  const normalizedClaim = normalize(claim || "").replace(/[^一-龥a-zA-Z0-9]/g, "");
  const normalizedOfficial = normalize(officialText).replace(/[^一-龥a-zA-Z0-9]/g, "");
  if (!normalizedClaim) return "UNVERIFIABLE";
  if (normalizedClaim.length >= 12 && normalizedOfficial.includes(normalizedClaim)) return "SUPPORTED";
  if (normalizedClaim.length < 12) return "NEEDS_REVIEW";

  const shingleSize = 8;
  const shingles = new Set<string>();
  for (let index = 0; index <= normalizedClaim.length - shingleSize; index += 1) {
    shingles.add(normalizedClaim.slice(index, index + shingleSize));
  }
  if (shingles.size === 0) return "NEEDS_REVIEW";
  const matched = Array.from(shingles).filter(shingle => normalizedOfficial.includes(shingle)).length;
  return matched / shingles.size >= 0.6 ? "SUPPORTED" : "NEEDS_REVIEW";
}

const hash = async (value: string) => {
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined;
  }
};

function parseStatuteCitation(citation: string): { lawName: string; article: string; sourceUrl: string } | null {
  const match = normalize(citation).match(/^(.+?法)第(\d+(?:之\d+)?)條/);
  if (!match) return null;
  const [, lawName, article] = match;
  const pcode = STATUTE_PCODES[lawName];
  if (!pcode) return null;
  const url = new URL("/LawClass/LawSingle.aspx", LAW_ORIGIN);
  url.searchParams.set("pcode", pcode);
  url.searchParams.set("flno", article.replace(/之/g, "-"));
  return { lawName, article, sourceUrl: url.toString() };
}

function safeJudgmentUrl(value: string, base = JUDGMENT_BASE): URL | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" || url.hostname !== "judgment.judicial.gov.tw" || !url.pathname.startsWith("/FJUD/")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

class CookieJar {
  private readonly values = new Map<string, string>();

  capture(headers: Headers): void {
    const compatibleHeaders = headers as Headers & { getSetCookie?: () => string[] };
    const rawValues = compatibleHeaders.getSetCookie?.() || (headers.get("set-cookie") ? [headers.get("set-cookie")!] : []);
    for (const rawValue of rawValues) {
      for (const cookie of rawValue.split(/,(?=[^;,]+=)/)) {
        const pair = cookie.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0) this.values.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
      }
    }
  }

  toHeader(): string {
    return Array.from(this.values, ([key, value]) => `${key}=${value}`).join("; ");
  }
}

async function verifyStatute(
  citation: string,
  claim: string | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  checkedAt: string
): Promise<OfficialEvidence> {
  const route = parseStatuteCitation(citation);
  if (!route) {
    return {
      citation,
      type: "STATUTE",
      status: "UNAVAILABLE",
      source: "全國法規資料庫",
      sourceUrl: LAW_ORIGIN,
      checkedAt,
      query: citation,
      matchStrategy: "OFFICIAL_ARTICLE_PAGE",
      claimSupportStatus: claim ? "UNVERIFIABLE" : undefined,
      error: "OFFICIAL_ROUTE_UNRESOLVED"
    };
  }

  const response = await fetchImpl(route.sourceUrl, {
    signal,
    headers: { Accept: "text/html", "User-Agent": USER_AGENT }
  });
  if (!response.ok) {
    return {
      citation,
      type: "STATUTE",
      status: "UNAVAILABLE",
      source: "全國法規資料庫",
      sourceUrl: route.sourceUrl,
      checkedAt,
      query: citation,
      matchStrategy: "OFFICIAL_ARTICLE_PAGE",
      claimSupportStatus: claim ? "UNVERIFIABLE" : undefined,
      error: `HTTP_${response.status}`
    };
  }

  const body = textFromHtml(await response.text());
  const normalizedBody = normalize(body);
  const exact = normalizedBody.includes(normalize(route.lawName))
    && normalizedBody.includes(`第${route.article}條`)
    && !/查無資料|無符合|沒有符合/.test(normalizedBody);

  return {
    citation,
    type: "STATUTE",
    status: exact ? "VERIFIED" : "NOT_FOUND",
    source: "全國法規資料庫",
    sourceUrl: route.sourceUrl,
    checkedAt,
    query: citation,
    matchStrategy: "OFFICIAL_ARTICLE_PAGE",
    contentHash: exact ? await hash(body) : undefined,
    snippet: exact ? body.slice(0, 240) : undefined,
    claimSupportStatus: claim ? (exact ? assessClaimSupport(claim, body) : "UNVERIFIABLE") : undefined
  };
}

async function verifyPrecedent(
  citation: string,
  claim: string | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  checkedAt: string
): Promise<OfficialEvidence> {
  const jar = new CookieJar();
  const request = async (url: string | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "text/html");
    headers.set("User-Agent", USER_AGENT);
    if (jar.toHeader()) headers.set("Cookie", jar.toHeader());
    const response = await fetchImpl(url, { ...init, signal, headers });
    jar.capture(response.headers);
    return response;
  };
  const baseEvidence = {
    citation,
    type: "PRECEDENT" as const,
    source: "司法院裁判書系統",
    checkedAt,
    query: citation,
    matchStrategy: "OFFICIAL_SEARCH_AND_DOCUMENT_EXACT_CASE_NUMBER"
  };

  const searchPage = await request(JUDGMENT_SEARCH);
  if (!searchPage.ok) return { ...baseEvidence, status: "UNAVAILABLE", sourceUrl: JUDGMENT_SEARCH, error: `HTTP_${searchPage.status}` };
  const searchHtml = await searchPage.text();
  const $search = cheerio.load(searchHtml);
  const params = new URLSearchParams();
  $search("input[type=hidden]").each((_, element) => {
    const name = $search(element).attr("name");
    if (name) params.set(name, $search(element).attr("value") || "");
  });
  if (!params.has("__VIEWSTATE")) {
    return { ...baseEvidence, status: "UNAVAILABLE", sourceUrl: JUDGMENT_SEARCH, error: "OFFICIAL_SEARCH_FORM_CHANGED" };
  }
  params.set("txtKW", citation);
  params.set("judtype", "JUDBOOK");
  params.set("whosub", "0");
  params.set("ctl00$cp_content$btnSimpleQry", "送出查詢");

  const searchResult = await request(JUDGMENT_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: JUDGMENT_ORIGIN,
      Referer: JUDGMENT_SEARCH
    },
    body: params
  });
  if (!searchResult.ok) return { ...baseEvidence, status: "UNAVAILABLE", sourceUrl: JUDGMENT_SEARCH, error: `HTTP_${searchResult.status}` };
  const $searchResult = cheerio.load(await searchResult.text());
  const listHref = $searchResult('a[href*="qryresultlst.aspx"]').first().attr("href");
  const listUrl = listHref ? safeJudgmentUrl(listHref) : null;
  if (!listUrl) return { ...baseEvidence, status: "NOT_FOUND", sourceUrl: JUDGMENT_SEARCH };

  const listResponse = await request(listUrl, { headers: { Referer: JUDGMENT_SEARCH } });
  if (!listResponse.ok) return { ...baseEvidence, status: "UNAVAILABLE", sourceUrl: listUrl.toString(), error: `HTTP_${listResponse.status}` };
  const $list = cheerio.load(await listResponse.text());
  const target = normalize(citation);
  let detailHref: string | undefined;
  $list("a[href]").each((_, element) => {
    if (detailHref) return;
    const label = normalize($list(element).text());
    if (label.includes(target)) detailHref = $list(element).attr("href");
  });
  const detailUrl = detailHref ? safeJudgmentUrl(detailHref, listUrl.toString()) : null;
  if (!detailUrl) return { ...baseEvidence, status: "NOT_FOUND", sourceUrl: listUrl.toString() };

  const detailResponse = await request(detailUrl, { headers: { Referer: listUrl.toString() } });
  if (!detailResponse.ok) return { ...baseEvidence, status: "UNAVAILABLE", sourceUrl: detailUrl.toString(), error: `HTTP_${detailResponse.status}` };
  const body = textFromHtml(await detailResponse.text());
  const exact = normalize(body).includes(target);

  return {
    ...baseEvidence,
    status: exact ? "VERIFIED" : "NOT_FOUND",
    sourceUrl: detailUrl.toString(),
    contentHash: exact ? await hash(body) : undefined,
    snippet: exact ? body.slice(0, 240) : undefined,
    claimSupportStatus: claim ? (exact ? assessClaimSupport(claim, body) : "UNVERIFIABLE") : undefined
  };
}

/**
 * 以去識別化法律爭點查詢司法院公開裁判書系統，並逐筆讀取官方明細頁。
 * 搜尋結果只有在取得 /FJUD/data.aspx 內容與 SHA-256 後才會回傳。
 */
export async function searchOfficialJudgments(
  query: string,
  options: OfficialVerificationOptions = {}
): Promise<OfficialJudgmentSearchSummary> {
  const normalizedQuery = query.replace(/\s+/g, " ").trim().slice(0, 120);
  const checkedAt = new Date().toISOString();
  const base = {
    query: normalizedQuery,
    source: "司法院裁判書系統" as const,
    sourceUrl: JUDGMENT_SEARCH,
    checkedAt
  };
  if (!normalizedQuery) {
    return { ...base, results: [], status: "NOT_FOUND", attempted: false, error: "EMPTY_QUERY" };
  }
  if (process.env.NODE_ENV === "test" && !options.fetchImpl) {
    return { ...base, results: [], status: "UNAVAILABLE", attempted: false, error: "TEST_NETWORK_DISABLED" };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  const jar = new CookieJar();
  const request = async (url: string | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "text/html");
    headers.set("User-Agent", USER_AGENT);
    if (jar.toHeader()) headers.set("Cookie", jar.toHeader());
    const response = await fetchImpl(url, { ...init, signal: controller.signal, headers });
    jar.capture(response.headers);
    return response;
  };

  try {
    const searchPage = await request(JUDGMENT_SEARCH);
    if (!searchPage.ok) return { ...base, results: [], status: "UNAVAILABLE", attempted: true, error: `HTTP_${searchPage.status}` };
    const $search = cheerio.load(await searchPage.text());
    const params = new URLSearchParams();
    $search("input[type=hidden]").each((_, element) => {
      const name = $search(element).attr("name");
      if (name) params.set(name, $search(element).attr("value") || "");
    });
    if (!params.has("__VIEWSTATE")) {
      return { ...base, results: [], status: "UNAVAILABLE", attempted: true, error: "OFFICIAL_SEARCH_FORM_CHANGED" };
    }
    params.set("txtKW", normalizedQuery);
    params.set("judtype", "JUDBOOK");
    params.set("whosub", "0");
    params.set("ctl00$cp_content$btnSimpleQry", "送出查詢");

    const searchResult = await request(JUDGMENT_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: JUDGMENT_ORIGIN,
        Referer: JUDGMENT_SEARCH
      },
      body: params
    });
    if (!searchResult.ok) return { ...base, results: [], status: "UNAVAILABLE", attempted: true, error: `HTTP_${searchResult.status}` };
    const $searchResult = cheerio.load(await searchResult.text());
    const listHref = $searchResult('a[href*="qryresultlst.aspx"]').first().attr("href");
    const listUrl = listHref ? safeJudgmentUrl(listHref) : null;
    if (!listUrl) return { ...base, results: [], status: "NOT_FOUND", attempted: true };

    const listResponse = await request(listUrl, { headers: { Referer: JUDGMENT_SEARCH } });
    if (!listResponse.ok) return { ...base, sourceUrl: listUrl.toString(), results: [], status: "UNAVAILABLE", attempted: true, error: `HTTP_${listResponse.status}` };
    const $list = cheerio.load(await listResponse.text());
    const candidates: Array<{ label: string; url: URL }> = [];
    const seen = new Set<string>();
    const maxResults = Math.max(1, Math.min(options.maxResults ?? 3, 5));
    $list('a[href*="data.aspx"]').each((_, element) => {
      if (candidates.length >= maxResults) return;
      const url = safeJudgmentUrl($list(element).attr("href") || "", listUrl.toString());
      const label = $list(element).text().replace(/\s+/g, " ").trim();
      if (!url || !label || !/\d+.*號/.test(label) || seen.has(url.toString())) return;
      seen.add(url.toString());
      candidates.push({ label, url });
    });

    const results: OfficialJudgmentSearchResult[] = [];
    for (const candidate of candidates) {
      const detailResponse = await request(candidate.url, { headers: { Referer: listUrl.toString() } });
      if (!detailResponse.ok) continue;
      const detailHtml = await detailResponse.text();
      const $detail = cheerio.load(detailHtml);
      const officialText = ($detail("#jud").text() || $detail(".jud_content").text() || $detail(".htmlcontent").text() || $detail("body").text())
        .replace(/\s+/g, " ")
        .trim();
      const normalizedLabel = normalize(candidate.label).replace(/判決|裁定/g, "");
      if (!officialText || !normalize(officialText).includes(normalizedLabel)) continue;
      const contentHash = await hash(officialText);
      if (!contentHash) continue;
      const courtName = candidate.label.match(/^(最高法院|最高行政法院|臺灣高等法院(?:\s+\S+分院)?|[^\d]{2,20}法院)/)?.[1]?.trim() || "司法院所屬法院";
      results.push({
        caseNumber: candidate.label,
        courtName,
        summary: officialText.slice(0, 500),
        sourceUrl: candidate.url.toString(),
        checkedAt,
        contentHash
      });
    }

    return {
      ...base,
      sourceUrl: listUrl.toString(),
      results,
      status: results.length > 0 ? "VERIFIED" : "NOT_FOUND",
      attempted: true
    };
  } catch (error: any) {
    return {
      ...base,
      results: [],
      status: "UNAVAILABLE",
      attempted: true,
      error: error?.name === "AbortError" ? "TIMEOUT" : "FETCH_FAILED"
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyOfficialCitations(
  inputs: Array<OfficialCitationInput | string>,
  options: OfficialVerificationOptions = {}
): Promise<OfficialVerificationSummary> {
  const typed = inputs
    .map(item => typeof item === "string" ? { citation: item, type: "STATUTE" as const } : item)
    .filter(item => item.citation?.trim())
    .map(item => ({ ...item, citation: item.citation.trim() }));
  const unique = Array.from(new Map(typed.map(item => [`${item.type}:${item.citation}`, item])).values());
  if (unique.length === 0) return { evidence: [], allVerified: false, attempted: false, reason: "NO_CITATIONS" };
  if (process.env.NODE_ENV === "test" && !options.fetchImpl) {
    return { evidence: [], allVerified: false, attempted: false, reason: "TEST_NETWORK_DISABLED" };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const timeout = options.timeoutMs ?? 8000;
  const evidence: OfficialEvidence[] = [];

  for (const item of unique) {
    const checkedAt = new Date().toISOString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      evidence.push(item.type === "PRECEDENT"
        ? await verifyPrecedent(item.citation, item.claim, fetchImpl, controller.signal, checkedAt)
        : await verifyStatute(item.citation, item.claim, fetchImpl, controller.signal, checkedAt));
    } catch (error: any) {
      evidence.push({
        citation: item.citation,
        type: item.type,
        status: "UNAVAILABLE",
        source: item.type === "PRECEDENT" ? "司法院裁判書系統" : "全國法規資料庫",
        sourceUrl: item.type === "PRECEDENT" ? JUDGMENT_SEARCH : LAW_ORIGIN,
        checkedAt,
        query: item.citation,
        matchStrategy: item.type === "PRECEDENT"
          ? "OFFICIAL_SEARCH_AND_DOCUMENT_EXACT_CASE_NUMBER"
          : "OFFICIAL_ARTICLE_PAGE",
        error: error?.name === "AbortError" ? "TIMEOUT" : "FETCH_FAILED"
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    evidence,
    allVerified: evidence.length === unique.length && evidence.every(item =>
      item.status === "VERIFIED" && (!item.claimSupportStatus || item.claimSupportStatus === "SUPPORTED")
    ),
    attempted: true
  };
}
