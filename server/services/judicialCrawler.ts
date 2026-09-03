import * as cheerio from "cheerio";

export function normalizeTaiwanCaseQuery(input: string): string {
  if (!input) return "";
  let clean = input.trim();

  // 1. If user pastes a judicial URL
  if (clean.includes("judgment.judicial.gov.tw") || clean.includes("http://") || clean.includes("https://")) {
    try {
      const urlObj = new URL(clean);
      const idParam = urlObj.searchParams.get("id") || urlObj.searchParams.get("jrecno") || urlObj.searchParams.get("kw");
      if (idParam) {
        clean = decodeURIComponent(idParam);
      }
    } catch (e) {}
  }

  // 2. If it is JID / comma-separated format
  if (clean.includes(",")) {
    const parts = clean.split(",");
    if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
      return `${parts[0]} ${parts[1]} ${parts[2]}`;
    } else if (parts.length >= 4) {
      return `${parts[1]} ${parts[2]} ${parts[3]}`;
    }
  }

  // 3. Regex match for standard Chinese case format
  const match = clean.match(/(?:[\u4e00-\u9fa5]+院\s*)?(\d{1,3})\s*(?:年度|年)?\s*([\u4e00-\u9fa5\(\)\（\）]+?)\s*(?:字第|第|字)?\s*(\d+)\s*號?/);
  if (match) {
    const year = match[1];
    let type = match[2].replace(/^(?:年度|年)/, "").replace(/(?:字第|第|字)$/, "").trim();
    const num = match[3];
    return `${year} ${type} ${num}`;
  }
  return clean;
}

export async function fetchJudicialHtml(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.hostname !== "judgment.judicial.gov.tw") {
    throw new Error("SSRF_VIOLATION: 僅允許抓取司法院裁判書系統 (judgment.judicial.gov.tw)");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("SSRF_VIOLATION: 不支援的通訊協定");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`司法院伺服器回應異常: ${res.status}`);
    }

    const text = await res.text();
    if (text.length > 5 * 1024 * 1024) {
      throw new Error("RESPONSE_TOO_LARGE: 裁判書內容過大 (超過 5MB)");
    }
    return text;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("TIMEOUT: 司法院系統連線逾時");
    }
    throw error;
  }
}

export function parseJudicialJudgment(html: string): { fullText: string; caseNumber?: string; courtName?: string } {
  const $ = cheerio.load(html);
  
  // 移除腳本與樣式
  $("script, style, noscript, iframe").remove();
  
  let fullText = $(".jud-content, #jud, .jud-body, .text-content, pre").text().trim();
  if (!fullText) {
    fullText = $("body").text().trim();
  }

  const title = $("title").text().trim();
  return {
    fullText,
    caseNumber: title
  };
}
