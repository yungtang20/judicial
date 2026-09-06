import { Router, Request, Response } from "express";
import dns from "node:dns/promises";
import net from "node:net";

const router = Router();
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB limit

/**
 * 判斷 IPv4 是否屬於私人、保留或環回位址
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // 格式異常視為不安全
  }

  const [b0, b1] = parts;
  // 0.0.0.0/8
  if (b0 === 0) return true;
  // 10.0.0.0/8
  if (b0 === 10) return true;
  // 100.64.0.0/10 (CGNAT: 100.64 - 100.127)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (172.16 - 172.31)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 & 192.0.2.0/24
  if (b0 === 192 && b1 === 0) return true;
  // 192.88.99.0/24
  if (b0 === 192 && b1 === 88) return true;
  // 192.168.0.0/16 (Private LAN)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Benchmark)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 & 203.0.113.0/24
  if (b0 === 198 && b1 === 51) return true;
  if (b0 === 203 && b1 === 0) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (b0 >= 224) return true;

  return false;
}

/**
 * 判斷 IPv6 是否屬於私人、保留或環回位址
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Loopback (::1) & Unspecified (::)
  if (normalized === "::1" || normalized === "::" || normalized === "0:0:0:0:0:0:0:1" || normalized === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00 to fdff)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-Local (fe80::/10)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith("ff")) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (normalized.startsWith("2001:db8") || normalized.startsWith("2001:0db8")) {
    return true;
  }

  return false;
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
    const cleanHost = hostname.replace(/^\[|\]$/g, ""); // 移除 IPv6 括號

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
 * 解析 DNS 並確認所有解析出的 IP 均非私有/保留位址 (防止 DNS Rebinding)
 */
export async function verifyDnsSafe(hostname: string): Promise<boolean> {
  const cleanHost = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(cleanHost)) {
    return !isPrivateIp(cleanHost);
  }

  try {
    const records = await dns.lookup(cleanHost, { all: true, verbatim: true });
    if (!records || records.length === 0) {
      return false;
    }

    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理 HTML 取得標題與內文
 */
function extractHtmlText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/[\r\n\t]+/g, " ").trim() : "";

  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

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
    let finalResponse: globalThis.Response | null = null;

    // 手動重導向迴圈，每次重導向均完整執行 DNS 與 IP 驗證 (避免 Redirect SSRF)
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

      const isDnsSafe = await verifyDnsSafe(check.parsed.hostname);
      if (!isDnsSafe) {
        const errorMsg = "解析目標位址為內部保留或受限 IP，已阻擋存取 (SSRF 防禦)";
        return res.status(400).json({
          code: "SSRF_BLOCKED",
          message: errorMsg,
          error: errorMsg,
          requestId,
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      try {
        const fetchRes = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (SmartLegalAssistant; Crawler/1.0)",
            Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        // 判斷是否為重導向 (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            return res.status(502).json({
              code: "TOO_MANY_REDIRECTS",
              message: "來源網址重新導向次數過多",
              requestId,
            });
          }

          const location = fetchRes.headers.get("location");
          if (!location) {
            return res.status(502).json({
              code: "FETCH_FAILED",
              message: "重導向回應未包含有效的目標位置",
              requestId,
            });
          }

          currentUrl = new URL(location, currentUrl).toString();
          continue; // 進行下一輪驗證與抓取
        }

        finalResponse = fetchRes;
        break;
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        throw fetchErr;
      }
    }

    if (!finalResponse) {
      return res.status(502).json({
        code: "FETCH_FAILED",
        message: "無法自來源網址取得內容",
        requestId,
      });
    }

    if (!finalResponse.ok) {
      return res.status(finalResponse.status).json({
        code: "UPSTREAM_ERROR",
        message: `來源伺服器回應異常，狀態碼: ${finalResponse.status}`,
        requestId,
      });
    }

    // 檢驗 Content-Type: 僅允許 HTML 或純文字
    const contentType = finalResponse.headers.get("content-type") || "";
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

    // 檢驗 Content-Length
    const contentLength = finalResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return res.status(413).json({
        code: "PAYLOAD_TOO_LARGE",
        message: "目標網頁容量超過 2MB 限制",
        requestId,
      });
    }

    const html = await finalResponse.text();
    if (Buffer.byteLength(html, "utf8") > MAX_BODY_BYTES) {
      return res.status(413).json({
        code: "PAYLOAD_TOO_LARGE",
        message: "目標網頁內容超過 2MB 限制",
        requestId,
      });
    }

    const { title, text } = extractHtmlText(html);
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
  } catch (err: any) {
    if (err.name === "AbortError") {
      return res.status(504).json({
        code: "GATEWAY_TIMEOUT",
        message: "讀取目標網址連線逾時",
        requestId,
      });
    }

    // 記錄詳細原因於後台日誌，不外洩內部例外堆疊
    console.error("[FetchUrlError]:", err?.message || err);
    return res.status(502).json({
      code: "FETCH_FAILED",
      message: "無法取得外部網址內容",
      requestId,
    });
  }
});

export default router;
