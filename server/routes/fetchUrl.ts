import { Router, Request, Response } from "express";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
const router = Router();
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB limit

/**
 * 判斷 IPv4 是否屬於私人、保留或環回位址（CIDR 表單，未格式視為不安全）
 */
function parseIPv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const p of parts) {
    const n = Number(p);
    if (p === "" || !Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

// 私人/保留/環回 IPv4 網段（保留原本較寬的 192.88/16、198.51/16、203.0/16 封鎖語意）
const PRIVATE_V4_CIDRS: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 8], // 0.0.0.0/8
  [0x0a000000, 8], // 10.0.0.0/8
  [0x64400000, 10], // 100.64.0.0/10 (CGNAT)
  [0x7f000000, 8], // 127.0.0.0/8 (Loopback)
  [0xa9fe0000, 16], // 169.254.0.0/16 (Link-Local & 雲端 Metadata)
  [0xac100000, 12], // 172.16.0.0/12
  [0xc0000000, 16], // 192.0.0.0/16
  [0xc0580000, 16], // 192.88.0.0/16
  [0xc6120000, 15], // 198.18.0.0/15 (Benchmark)
  [0xc6330000, 16], // 198.51.0.0/16
  [0xc0a80000, 16], // 192.168.0.0/16 (Private LAN)
  [0xcb000000, 16], // 203.0.0.0/16
  [0xe0000000, 4], // 224.0.0.0/4 (Multicast)
  [0xf0000000, 4], // 240.0.0.0/4 (Reserved / Broadcast)
];

function inCidrV4(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

function isPrivateIPv4(ip: string): boolean {
  const value = parseIPv4(ip);
  if (value === null) return true; // 格式異常視為不安全
  return PRIVATE_V4_CIDRS.some(([base, prefix]) => inCidrV4(value, base, prefix));
}

function inCidrV4FromUint(value: number): boolean {
  return PRIVATE_V4_CIDRS.some(([base, prefix]) => inCidrV4(value, base, prefix));
}

/**
 * 判斷 IPv6 是否屬於私人、保留或環回位址（128-bit CIDR 表單，格式異常視為不安全）
 */
function parseIPv6(ip: string): bigint | null {
  let s = ip.toLowerCase();
  // 結尾嵌入 IPv4 點分十進位（例如 ::ffff:127.0.0.1）→ 轉為兩個 16-bit 群
  const v4 = s.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const nums = v4.slice(1, 5).map(Number);
    if (v4.slice(1, 5).some((p) => p === "" || !Number.isInteger(nums[v4.slice(1, 5).indexOf(p)]) || Number(p) < 0 || Number(p) > 255)) {
      return null;
    }
    const val = ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
    s = s.slice(0, s.length - v4[0].length) + ((val >>> 16).toString(16) + ":" + (val & 0xffff).toString(16));
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const [left, right] = halves.length === 2 ? [halves[0], halves[1]] : [s, ""];
  const parseGroups = (g: string): number[] | null => {
    if (g === "") return [];
    const parts = g.split(":");
    if (parts.some((p) => p === "")) return null;
    const nums = parts.map((p) => parseInt(p, 16));
    if (parts.length > 8 || nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
    return nums;
  };
  const leftGroups = parseGroups(left);
  const rightGroups = parseGroups(right);
  if (!leftGroups || !rightGroups) return null;
  const total = leftGroups.length + rightGroups.length;
  if (halves.length === 2 ? total > 7 : total !== 8) return null;
  const groups = [...leftGroups, ...Array(8 - total).fill(0), ...rightGroups];
  let value = 0n;
  for (const g of groups) value = (value << 16n) | BigInt(g);
  return value;
}

// 私人/保留/環回 IPv6 網段（2001:db80::/32 保留原本 startswith("2001:db8") 的寬封鎖語意）
const PRIVATE_V6_CIDRS: ReadonlyArray<readonly [bigint, number]> = [
  [0n, 128], // ::/128 (Unspecified)
  [1n, 128], // ::1/128 (Loopback)
  [0xfc000000_00000000_00000000_00000000n, 7], // fc00::/7 (ULA)
  [0xfe800000_00000000_00000000_00000000n, 10], // fe80::/10 (Link-Local)
  [0xff000000_00000000_00000000_00000000n, 8], // ff00::/8 (Multicast)
  [0x0064ff9b000000000000000000000000n, 96], // NAT64 well-known prefix
  [0x20020000000000000000000000000000n, 16], // 6to4
  [0x20010000000000000000000000000000n, 32], // Teredo
  [0x20010db8_00000000_00000000_00000000n, 32], // 2001:db8::/32 (Documentation)
  [0x2001db80_00000000_00000000_00000000n, 28], // 2001:db80::/28（保留原本 startswith("2001:db8") 寬封鎖）
];

function inCidrV6(value: bigint, base: bigint, prefix: number): boolean {
  if (prefix === 0) return true;
  // mask keeps the top `prefix` bits of the 128-bit address (network portion)
  const fullMask = (1n << 128n) - 1n;
  const mask = prefix === 128 ? fullMask : fullMask ^ ((1n << BigInt(128 - prefix)) - 1n);
  return (value & mask) === (base & mask);
}

function isPrivateIPv6(ip: string): boolean {
  const value = parseIPv6(ip);
  if (value === null) return true; // 格式異常視為不安全
  const upper96 = value >> 32n;
  // IPv4-compatible (::/96) 與 IPv4-mapped (::ffff:0:0/96) 轉交 IPv4 檢查
  if (upper96 === 0n || upper96 === 0xffffn) {
    return inCidrV4FromUint(Number(value & 0xffffffffn));
  }
  return PRIVATE_V6_CIDRS.some(([base, prefix]) => inCidrV6(value, base, prefix));
}

/**
 * 檢查 IP 是否為私人、環回或保留網段
 */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true;
}

/**
 * 初步驗證 URL 格式與基本 Hostname (包含特殊十進位 IP、私有網域名稱)
 */
export function isBasicSafeUrl(targetUrl: string): { safe: boolean; parsed?: URL; reason?: string } {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "僅支援 HTTP 或 HTTPS 協議" };
    }

    const hostname = parsed.hostname.toLowerCase();
    const cleanHost = hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, ""); // 移除 IPv6 括號與 FQDN 尾隨點號

    // 檢查常見內網主機名稱
    if (
      cleanHost === "localhost" ||
      cleanHost === "0.0.0.0" ||
      cleanHost === "127.0.0.1" ||
      cleanHost === "::1" ||
      cleanHost.endsWith(".local") ||
      cleanHost.endsWith(".internal") ||
      cleanHost.endsWith(".arpa") ||
      cleanHost.endsWith(".lan")
    ) {
      return { safe: false, reason: "不允許存取本機或內網主機 (SSRF 防禦)" };
    }

    // 若直接以數字/十六進位 IP 表示法存取
    if (/^\d+$/.test(cleanHost) || /^0x[0-9a-f]+$/i.test(cleanHost)) {
      return { safe: false, reason: "不允許非標準數值 IP 位址 (SSRF 防禦)" };
    }

    // 若 host 為 IP 位址，直接檢驗是否為私有 IP
    if (net.isIP(cleanHost)) {
      if (isPrivateIp(cleanHost)) {
        return { safe: false, reason: "不允許存取私有或保留 IP (SSRF 防禦)" };
      }
    }

    return { safe: true, parsed };
  } catch {
    return { safe: false, reason: "網址格式無效" };
  }
}

/**
 * 解析 DNS 並確認所有解析出的 IP 均非私有/保留位址 (防止 DNS Rebinding)。
 * 回傳可安全固定至連線的位址；任一結果可疑時整組拒絕 (fail-closed)。
 */
export type DnsSafetyVerdict =
  | { status: 'safe'; addresses: string[] }
  /** 主機名稱無法解析：可能是網域不存在或 DNS 暫時故障，並非 SSRF。 */
  | { status: 'unresolvable'; addresses: [] }
  /** 解析到內部保留／受限位址，這才是真正的 SSRF 阻擋。 */
  | { status: 'private'; addresses: [] };

export async function classifyHostDns(hostname: string): Promise<DnsSafetyVerdict> {
  const cleanHost = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(cleanHost)) {
    return isPrivateIp(cleanHost)
      ? { status: 'private', addresses: [] }
      : { status: 'safe', addresses: [cleanHost] };
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(cleanHost, { all: true, verbatim: true });
  } catch {
    // 解析失敗與解析到私有位址是兩件事，混為一談會讓排查 SSRF 的人跑錯方向。
    return { status: 'unresolvable', addresses: [] };
  }
  if (!records || records.length === 0) {
    return { status: 'unresolvable', addresses: [] };
  }
  if (records.some((record) => isPrivateIp(record.address))) {
    return { status: 'private', addresses: [] };
  }
  return { status: 'safe', addresses: records.map((record) => record.address) };
}

export async function resolveSafeDnsAddresses(hostname: string): Promise<string[]> {
  return (await classifyHostDns(hostname)).addresses;
}

export async function verifyDnsSafe(hostname: string): Promise<boolean> {
  return (await classifyHostDns(hostname)).status === 'safe';
}

/** 建立只連線至已驗證 IP、但保留原 Host/SNI 的 request options。 */
export function createPinnedRequestOptions(target: URL, address: string): https.RequestOptions {
  const cleanHostname = target.hostname.replace(/^\[|\]$/g, "");
  const options: https.RequestOptions = {
    protocol: target.protocol,
    hostname: address,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    method: "GET",
    headers: {
      Host: target.host,
      "User-Agent": "Mozilla/5.0 (SmartLegalAssistant; Crawler/1.0)",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity",
    },
  };

  if (target.protocol === "https:" && net.isIP(cleanHostname) === 0) {
    options.servername = cleanHostname;
  }

  return options;
}

/** 使用已驗證的 IP 發出請求；此 helper 本身不解析 hostname。 */
export function requestPinnedUrl(target: URL, address: string, signal: AbortSignal): Promise<IncomingMessage> {
  const options = createPinnedRequestOptions(target, address);
  return new Promise((resolve, reject) => {
    let settled = false;
    const onResponse = (response: IncomingMessage) => {
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(response);
    };
    const onError = (error: Error) => {
      signal.removeEventListener("abort", onAbort);
      reject(error);
    };
    const onAbort = () => {
      if (settled) return;
      const error = createAbortError();
      request.destroy(error);
      reject(error);
    };
    const request = target.protocol === "https:"
      ? https.request(options, onResponse)
      : http.request(options, onResponse);

    request.once("error", onError);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    request.end();
  });
}

class PayloadTooLargeError extends Error {}

function createAbortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

/** 串流讀取回應本文，逐 chunk 限制 UTF-8 位元組並在超限時立即中止。 */
export function readBodyWithLimit(response: Readable, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    const cleanup = () => {
      response.off("data", onData);
      response.off("end", onEnd);
      response.off("error", onError);
      response.off("aborted", onAborted);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error) => {
      cleanup();
      response.destroy();
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        fail(new PayloadTooLargeError("目標網頁內容超過 2MB 限制"));
        return;
      }
      chunks.push(buffer);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks, totalBytes).toString("utf8"));
    };
    const onError = (error: Error) => fail(error);
    const onAborted = () => fail(createAbortError());
    const onAbort = () => fail(createAbortError());

    if (signal.aborted) {
      onAbort();
      return;
    }

    response.on("data", onData);
    response.once("end", onEnd);
    response.once("error", onError);
    response.once("aborted", onAborted);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}


/**
 * 清理 HTML 取得標題與內文
 */
function extractHtmlText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/[\r\n\t]+/g, " ").trim() : "";

  let cleaned = html;
  // 循環移除成對的 script/style/noscript 標籤區塊，防禦巢狀繞過
  let prevHtml: string;
  let iter = 0;
  do {
    prevHtml = cleaned;
    cleaned = cleaned
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
      .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, "");
    iter++;
  } while (cleaned !== prevHtml && iter < 10);

  // 清除殘留未閉合或孤立的標籤
  cleaned = cleaned.replace(/<\/?(script|style|noscript)\b[^>]*\/?>/gi, "");

  cleaned = cleaned.replace(/<\/(p|div|tr|h[1-6]|li|blockquote)>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*[\/]?>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    title,
    text: lines.join("\n"),
  };
}

router.post("/api/fetch-url", async (req: Request, res: Response) => {
  const requestId = req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({
        code: "INVALID_REQUEST",
        message: "請提供有效的 url 參數",
        requestId,
      });
    }
    let currentUrl = url.trim();
    let redirectCount = 0;
    let finalHtml = "";
    let hasFinalResponse = false;

    // 手動重導向迴圈；每一跳重新解析、驗證並將連線固定至已驗證 IP。
    while (redirectCount <= MAX_REDIRECTS) {
      const check = isBasicSafeUrl(currentUrl);
      if (!check.safe || !check.parsed) {
        const errorMsg = check.reason || "不允許存取本機或內部網路網址 (SSRF 防禦)";
        return res.status(400).json({
          code: "SSRF_BLOCKED",
          message: errorMsg,
          error: errorMsg,
          requestId,
        });
      }

      const dnsVerdict = await classifyHostDns(check.parsed.hostname);
      if (dnsVerdict.status !== 'safe') {
        // 區分「DNS 解析不到」與「解析到內部位址」：兩者的排查方向完全不同。
        const errorMsg = dnsVerdict.status === 'unresolvable'
          ? "無法解析此網域名稱，請確認網址是否正確（此情況非 SSRF 阻擋）"
          : "解析目標位址為內部保留或受限 IP，已阻擋存取 (SSRF 防禦)";
        return res.status(400).json({
          code: dnsVerdict.status === 'unresolvable' ? "HOST_UNRESOLVABLE" : "SSRF_BLOCKED",
          reason: dnsVerdict.status,
          message: errorMsg,
          error: errorMsg,
          requestId,
        });
      }
      const safeAddresses = dnsVerdict.addresses;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      let upstreamResponse: IncomingMessage | null = null;

      try {
        // hostname 僅用於 Host/SNI；TCP 連線直接使用剛完成安全驗證的 IP。
        upstreamResponse = await requestPinnedUrl(check.parsed, safeAddresses[0], controller.signal);

        if ([301, 302, 303, 307, 308].includes(upstreamResponse.statusCode || 0)) {
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            return res.status(502).json({
              code: "TOO_MANY_REDIRECTS",
              message: "來源網址重新導向次數過多",
              requestId,
            });
          }

          const location = upstreamResponse.headers.location;
          if (!location) {
            return res.status(502).json({
              code: "FETCH_FAILED",
              message: "重導向回應未包含有效的目標位置",
              requestId,
            });
          }

          currentUrl = new URL(Array.isArray(location) ? location[0] : location, currentUrl).toString();
          continue;
        }

        const statusCode = upstreamResponse.statusCode || 502;
        if (statusCode < 200 || statusCode >= 300) {
          return res.status(statusCode).json({
            code: "UPSTREAM_ERROR",
            message: `來源伺服器回應異常，狀態碼: ${statusCode}`,
            requestId,
          });
        }

        const contentTypeHeader = upstreamResponse.headers["content-type"];
        const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] || "" : contentTypeHeader || "";
        const isTextOrHtml =
          contentType.includes("text/html") ||
          contentType.includes("text/plain") ||
          contentType.includes("application/xhtml+xml");

        if (!isTextOrHtml) {
          return res.status(415).json({
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "來源網址並非文字或 HTML 網頁內容",
            requestId,
          });
        }

        const contentLengthHeader = upstreamResponse.headers["content-length"];
        const contentLength = Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader;
        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
          return res.status(413).json({
            code: "PAYLOAD_TOO_LARGE",
            message: "目標網頁容量超過 2MB 限制",
            requestId,
          });
        }

        // 同一個 deadline 從 DNS 後的連線建立持續涵蓋 headers 與本文讀取。
        hasFinalResponse = true;
        finalHtml = await readBodyWithLimit(upstreamResponse, controller.signal);
        break;
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof PayloadTooLargeError) {
          return res.status(413).json({
            code: "PAYLOAD_TOO_LARGE",
            message: "目標網頁內容超過 2MB 限制",
            requestId,
          });
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeout);
        if (upstreamResponse && !upstreamResponse.readableEnded) {
          upstreamResponse.destroy();
        }
      }
    }

    if (!hasFinalResponse) {
      return res.status(502).json({
        code: "FETCH_FAILED",
        message: "無法自來源網址取得內容",
        requestId,
      });
    }

    const { title, text } = extractHtmlText(finalHtml);
    if (!text || text.length < 10) {
      return res.status(422).json({
        code: "UNPROCESSABLE_ENTITY",
        message: "網址內容為空或無法辨識為有效文字",
        requestId,
      });
    }

    return res.json({
      title: title || "判決書或法律文件",
      text,
      url: currentUrl,
      requestId,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown fetch error");
    if (error.name === "AbortError") {
      return res.status(504).json({
        code: "GATEWAY_TIMEOUT",
        message: "讀取目標網址連線逾時",
        requestId,
      });
    }

    // 記錄詳細原因於後台日誌，不外洩內部例外堆疊
    console.error("[FetchUrlError]:", error.message);
    return res.status(502).json({
      code: "FETCH_FAILED",
      message: "無法取得外部網址內容",
      requestId,
    });
  }
});

export default router;
