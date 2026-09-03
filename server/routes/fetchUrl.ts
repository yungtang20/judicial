import { Router, Request, Response } from "express";

const router = Router();

/**
 * 簡易 SSRF 防禦檢查
 */
function isSafeUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
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

  // 移除 script, style, noscript
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  // 替換區塊標籤為換行
  cleaned = cleaned.replace(/<\/(p|div|tr|h[1-6]|li|blockquote)>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*[\/]?>/gi, "\n");

  // 移除所有 HTML 標籤
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 解碼常見 HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 合併多餘空白
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
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "請提供有效的 url 參數" });
    }

    const trimmedUrl = url.trim();
    if (!isSafeUrl(trimmedUrl)) {
      return res.status(400).json({ error: "不允許讀取本機或內部網路網址 (SSRF 防禦)" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const fetchResponse = await fetch(trimmedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (SmartLegalAssistant; Crawler/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({
        error: `無法自來源網址取得內容，HTTP 狀態碼: ${fetchResponse.status}`,
      });
    }

    const html = await fetchResponse.text();
    const { title, text } = extractHtmlText(html);

    if (!text || text.length < 10) {
      return res.status(422).json({ error: "網址內容為空或無法辨識為文字內容" });
    }

    return res.json({
      title: title || "判決書或法律文件",
      text,
      url: trimmedUrl,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "讀取目標網址連線逾時" });
    }
    return res.status(500).json({ error: err.message || "擷取網址發生內部伺服器錯誤" });
  }
});

export default router;
