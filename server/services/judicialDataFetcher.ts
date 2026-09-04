/**
 * Judicial Data Fetcher (Architecture 1 — Tier 3 fallback)
 *
 * Fetches judgment data from the Judicial OpenData system when:
 * 1. USE_OPENDATA is enabled (default: true)
 * 2. Current time is within service hours (00:00–05:59 Asia/Taipei)
 * 3. Circuit breaker is closed (not too many recent failures)
 *
 * Uses existing `judicialCrawler.ts` SSRF protection as the base layer.
 * This service adds authentication, service-hours gating, and circuit-breaking.
 */

import { getAuthToken, isCircuitOpen } from "./judicialAuthService.js";
import { isWithinServiceHours } from "./judicialServiceHours.js";

const OPENDATA_BASE = "https://judgment.judicial.gov.tw/FJUD";
const DEFAULT_TIMEOUT_MS = 3000;

export interface FetchResult {
  success: boolean;
  html?: string;
  error?: string;
  source: "opendata" | "unavailable";
}

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

    // Content validation
    if (html.length < 100) {
      return {
        success: false,
        error: "回應內容過短，可能不是有效判決 HTML",
        source: "unavailable",
      };
    }

    // Basic keyword validation — must contain legal markers
    const hasLegalContent =
      html.includes("判決") ||
      html.includes("裁定") ||
      html.includes("主文") ||
      html.includes("理由");

    if (!hasLegalContent) {
      return {
        success: false,
        error: "回應內容不含法律文書標記，可能不是有效判決",
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
