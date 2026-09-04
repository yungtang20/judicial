/**
 * Judicial OpenData Authentication Service
 *
 * Manages the auth token lifecycle for judgment.judicial.gov.tw.
 * - Gets and caches the auth token (expires after ~55 minutes).
 * - Circuit breaker: after 5 consecutive real failures, refuses requests
 *   for ~2 hours (only counts in-service-hours failures).
 */

const SERVICE_BASE = "https://judgment.judicial.gov.tw";

export interface AuthResult {
  token: string;
  success: boolean;
  error?: string;
}

interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number | null;
  totalOpenDuration: number;
}

const breaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: null,
  totalOpenDuration: 2 * 60 * 60 * 1000, // 2 hours in ms
};

let cachedToken: string | null = null;
let cachedTokenExpiry: number = 0;

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before actual expiry
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // tokens valid ~60 min, refresh at 55

/**
 * Check whether the circuit breaker is open (too many failures).
 */
export function isCircuitOpen(): boolean {
  if (breaker.openUntil === null) return false;
  if (Date.now() >= breaker.openUntil) {
    // Half-open: allow one attempt
    breaker.openUntil = null;
    return false;
  }
  return true;
}

/**
 * Record a failure in the circuit breaker. Only counts during service hours.
 * After 5 consecutive failures, opens the circuit for ~2 hours.
 */
export function recordFailure(): void {
  breaker.consecutiveFailures++;
  if (breaker.consecutiveFailures >= 5) {
    breaker.openUntil = Date.now() + breaker.totalOpenDuration;
    console.warn(
      `[JudicialAuth] Circuit breaker OPEN — ${breaker.consecutiveFailures} consecutive failures. Refusing requests for ~2 hours.`
    );
  }
}

/**
 * Record a success — resets the circuit breaker counter.
 */
export function recordSuccess(): void {
  breaker.consecutiveFailures = 0;
  breaker.openUntil = null;
}

/**
 * Get the auth token for the Judicial OpenData API.
 * Caches the token and refreshes before expiry.
 * Returns null on failure (does NOT throw).
 */
export async function getAuthToken(
  account: string,
  password: string
): Promise<string | null> {
  // Circuit breaker check
  if (isCircuitOpen()) {
    console.warn("[JudicialAuth] Circuit breaker OPEN — refusing request");
    return null;
  }

  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedTokenExpiry - TOKEN_BUFFER_MS) {
    return cachedToken;
  }

  try {
    const loginUrl = `${SERVICE_BASE}/FJUD/ExternalLogin.aspx`;

    // Step 1: Get login page (fetch cookies / __VIEWSTATE)
    const loginPageRes = await fetch(loginUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    if (!loginPageRes.ok) {
      recordFailure();
      console.error(`[JudicialAuth] Login page fetch failed: ${loginPageRes.status}`);
      return null;
    }

    const cookies = loginPageRes.headers.getSetCookie();
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

    const html = await loginPageRes.text();
    const viewstate = extractHiddenField(html, "__VIEWSTATE");
    const eventValidation = extractHiddenField(html, "__EVENTVALIDATION");

    // Step 2: POST login credentials
    const formData = new URLSearchParams();
    if (viewstate) formData.set("__VIEWSTATE", viewstate);
    if (eventValidation) formData.set("__EVENTVALIDATION", eventValidation);
    formData.set("txtAccount", account);
    formData.set("txtPassword", password);
    formData.set("btnLogin", "登入");

    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: cookieHeader,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    // Extract auth cookie from login response
    const authCookies = loginRes.headers.getSetCookie();
    const authCookieHeader = authCookies.map((c) => c.split(";")[0]).join("; ");

    if (!authCookieHeader || authCookieHeader.length === 0) {
      recordFailure();
      console.error("[JudicialAuth] No auth cookie returned — login may have failed");
      return null;
    }

    // Success — cache token
    cachedToken = authCookieHeader;
    cachedTokenExpiry = Date.now() + TOKEN_LIFETIME_MS;
    recordSuccess();
    return cachedToken;
  } catch (err: any) {
    recordFailure();
    console.error(`[JudicialAuth] getAuthToken error: ${err.message}`);
    return null;
  }
}

/**
 * Extract a hidden form field value from HTML (e.g. __VIEWSTATE).
 */
function extractHiddenField(html: string, name: string): string | null {
  const regex = new RegExp(
    `<input[^>]*name=["']${name}["'][^>]*value=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  return match ? match[1] : null;
}

/**
 * Reset circuit breaker (for testing only).
 */
export function resetCircuitBreaker(): void {
  breaker.consecutiveFailures = 0;
  breaker.openUntil = null;
  cachedToken = null;
  cachedTokenExpiry = 0;
}
