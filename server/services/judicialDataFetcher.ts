/**
 * Judicial Data Fetcher (Architecture 1 — Tier 3 fallback)
 *
 * Fetches judgment data from the Judicial OpenData system when:
 * 1. USE_OPENDATA is enabled (default: true)
 * 2. Current time is within service hours (00:00–05:59 Asia/Taipei)
 * 3. Circuit breaker is closed (not too many recent failures)
 *
 * Uses existing judicialCrawler.ts SSRF protection as the base layer.
 * This service adds authentication, service-hours gating, and circuit-breaking.
 *
 * Tier 1: TLR (tw-legal-rag) semantic search with JID priority matching
 * Tier 2: Judicial OpenData authenticated fetch (rate-limited)
 * Tier 3: Scraper fallback (external)
 */

import { searchLegalSources } from "../../src/lib/twLegalRagClient.js";
import { getAuthToken, isCircuitOpen } from "./judicialAuthService.js";
import { isWithinServiceHours } from "./judicialServiceHours.js";

const OPENDATA_BASE = "https://judgment.judicial.gov.tw/FJUD";
const DEFAULT_TIMEOUT_MS = 3000;
const OPENDATA_RATE_WINDOW_MS = 60 * 1000;
const OPENDATA_RATE_LIMIT = 10;

export interface FetchResult {
  success: boolean;
  html?: string;
  error?: string;
  source: "opendata" | "tlr" | "unavailable";
}

// --- Rate limiting state ---
const openDataCallTracker = { count: 0, lastResetTime: Date.now() };

/**
 * Check OpenData API rate limit (max 10 calls per 60 seconds).
 * Returns true if rate limit is exceeded.
 */
function checkOpenDataRateLimit(): boolean {
  const now = Date.now();
  if (now - openDataCallTracker.lastResetTime > OPENDATA_RATE_WINDOW_MS) {
    openDataCallTracker.count = 0;
    openDataCallTracker.lastResetTime = now;
  }
  if (openDataCallTracker.count >= OPENDATA_RATE_LIMIT) {
    return true;
  }
  openDataCallTracker.count++;
  return false;
}

// --- JID regex ---
const JID_REGEX = /^[A-Z]{2,4},\d{2,4},[^,]+,\d+,(\d{8}|\d{7}),\d+$/;

/**
 * Check if OpenData fetching is enabled via environment.
 */
export function isOpenDataEnabled(): boolean {
  const val = process.env.USE_OPENDATA?.toLowerCase() ?? "true";
  return val === "true" || val === "1";
}

/**
 * Get the configured timeout for OpenData requests.
 */
export function getOpenDataTimeoutMs(): number {
  const raw = process.env.OPENDATA_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * Validate crawled content: must be long enough and contain legal keywords.
 */
export function validateCrawledContent(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 100) return false;
  const legalKeywords = ["裁判", "法院", "字號"];
  return legalKeywords.some((kw) => trimmed.includes(kw));
}

/**
 * Attempt to fetch judgment HTML from the Judicial OpenData system.
 *
 * Returns `{ success: false, source: "unavailable" }` on any failure
 * (service hours, circuit breaker, auth, network) — never throws.
 */
export async function fetchFromOpenData(
  caseId: string,
  options?: { timeoutMs?: number }
): Promise<FetchResult> {
  // Gate 1: Feature disabled?
  if (!isOpenDataEnabled()) {
    return {
      success: false,
      error: "OpenData 已停用（USE_OPENDATA=false）",
      source: "unavailable",
    };
  }

  // Gate 2: Service hours?
  const hoursCheck = isWithinServiceHours();
  if (!hoursCheck.withinHours) {
    return {
      success: false,
      error: hoursCheck.reason,
      source: "unavailable",
    };
  }

  // Gate 3: Circuit breaker?
  if (isCircuitOpen()) {
    return {
      success: false,
      error: "Circuit breaker OPEN — 近期連續失敗過多，暫時拒絕請求",
      source: "unavailable",
    };
  }

  // ── Tier 1: TLR semantic search with JID priority matching ──
  try {
    const tlrEnabled = process.env.TLR_ENABLED === "true";
    if (tlrEnabled) {
      const tlrResult = await searchLegalSources(caseId);

      let bestMatch: { excerpt?: string; title?: string; citation?: string } | null = null;
      const isJid = JID_REGEX.test(caseId);

      if (isJid && tlrResult?.judgments?.length) {
        bestMatch =
          tlrResult.judgments.find(
            (r) =>
              r.citation?.includes(caseId) || r.title?.includes(caseId)
          ) || tlrResult.judgments[0];
      } else if (tlrResult?.judgments?.length) {
        bestMatch = tlrResult.judgments[0];
      }

      if (bestMatch) {
        const html = bestMatch.excerpt || bestMatch.title || "";
        if (validateCrawledContent(html)) {
          return { success: true, html, source: "tlr" };
        }
      }
    }
  } catch (err: any) {
    console.warn("[DataFetcher] TLR Tier 1 failed:", err.message);
  }

  // ── Tier 2: OpenData authenticated fetch ──
  // Rate limit check — skip to unavailable if exceeded
  if (checkOpenDataRateLimit()) {
    console.warn("[DataFetcher] OpenData rate limit exceeded, skipping Tier 2");
    return {
      success: false,
      error: "OpenData API 限流（每分鐘最多 10 次），請稍後再試",
      source: "unavailable",
    };
  }

  // Gate 4: Get auth token
  const account = process.env.JUDICIAL_OPENDATA_ACCOUNT;
  const password = process.env.JUDICIAL_OPENDATA_PASSWORD;

  if (!account || !password) {
    return {
      success: false,
      error: "JUDICIAL_OPENDATA_ACCOUNT 或 JUDICIAL_OPENDATA_PASSWORD 未設定",
      source: "unavailable",
    };
  }

  const token = await getAuthToken(account, password);
  if (!token) {
    return {
      success: false,
      error: "無法取得司法院認證 token",
      source: "unavailable",
    };
  }

  // ── Problem 1: Cross-06:00 recheck ──
  // After auth (which may take time), verify we're still within service hours.
  // If we crossed 06:00 during auth, abort instead of sending a doomed request.
  if (!isWithinServiceHours().withinHours) {
    console.warn("[DataFetcher] Auth 後跨 06:00，跳過 OpenData 降級爬取");
    return {
      success: false,
      error: "Auth 後跨 06:00，服務時段已結束",
      source: "unavailable",
    };
  }

  // Gate 5: Actually fetch the judgment
  const timeoutMs = options?.timeoutMs ?? getOpenDataTimeoutMs();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchUrl = `${OPENDATA_BASE}/printData.aspx?id=${encodeURIComponent(caseId)}`;

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        Cookie: token,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        error: `OpenData 回應失敗 HTTP ${res.status}`,
        source: "unavailable",
      };
    }

    const html = await res.text();

    // Content validation — must contain legal keywords and be long enough
    if (!validateCrawledContent(html)) {
      return {
        success: false,
        error: "回應內容不含法律文書標記或過短，可能不是有效判決",
        source: "unavailable",
      };
    }

    return { success: true, html, source: "opendata" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return {
        success: false,
        error: `OpenData 請求逾時（${timeoutMs}ms）`,
        source: "unavailable",
      };
    }
    return {
      success: false,
      error: `OpenData 請求失敗：${err.message}`,
      source: "unavailable",
    };
  }
}
