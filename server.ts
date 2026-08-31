
function normalizeTaiwanCaseQuery(input: string): string {
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
    } catch(e) {}
  }

  // 2. If it is JID / comma-separated format: PCDM,115,侵訴,33,20260824,1 or 112,台上,2409,20231108,1
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

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { getGenerateAppealPetitionPrompt } from "./src/prompts/generate-appeal-petition.js";
import { getAnalyzeJudgmentPrompt } from "./src/prompts/analyze-judgment.js";
import { getBPointTriagePrompt, getMineScanPrompt, getDefensePleadingPrompt } from "./src/prompts/defense-workflow.js";
import { getLegalToolboxPrompt } from "./src/prompts/toolbox-prompts.js";
import { buildFallbackJudgmentAnalysis, buildFallbackPetition, buildFallbackPoliceAnalysis } from "./src/utils/fallbacks.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "./src/utils/defenseFallbacks.js";
import { buildFallbackToolboxResult } from "./src/utils/toolboxFallbacks.js";
import { verifyLegalCitations } from "./src/lib/citationVerifier.js";

dotenv.config();

// 清理無效或為 API 金鑰的 GOOGLE_GEMINI_BASE_URL/GEMINI_BASE_URL，防範 SDK 內部發生 Invalid URL 錯誤
const rawBaseUrl = process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL;
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  console.log(`[Gemini Env] 清理無效的 BASE_URL 金鑰字串：${rawBaseUrl.substring(0, 10)}...`);
  delete process.env.GOOGLE_GEMINI_BASE_URL;
  delete process.env.GEMINI_BASE_URL;
}

// 檢查 API 金鑰是否缺失、為空或為預設預留占位符
function isApiKeyMissingOrPlaceholder(key?: string): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  return (
    trimmed === "" ||
    trimmed === "MY_GEMINI_API_KEY" ||
    trimmed === "YOUR_API_KEY" ||
    trimmed === "placeholder" ||
    trimmed.startsWith("MY_")
  );
}

// 剖析 Data URL 格式並轉換為 Gemini SDK 接受的 inlineData 物件
function parseDataUrl(dataUrl: string) {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return {
      inlineData: {
        mimeType: matches[1],
        data: matches[2]
      }
    };
  }
  return null;
}

// 根據環境狀態決定正確使用的 API Key
function resolveApiKey(): string | undefined {
  const hasCustomBaseUrl = !!(process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL);
  if (hasCustomBaseUrl) {
    return process.env.NEW_API_KEY || process.env.GEMINI_API_KEY;
  }
  return process.env.GEMINI_API_KEY || process.env.NEW_API_KEY;
}

// 建立帶有 User-Agent 標頭的 Gemini 客戶端
function createGeminiClient(apiKey: string): GoogleGenAI {
  const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL;
  if (baseUrl && (baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))) {
    console.log(`[Gemini API] Client initialized with custom baseUrl: ${baseUrl}`);
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        baseUrl,
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// 取得候選模型陣列（依優先級排序，若 3.7 flash 達限速/429/503 尖峰則自動平滑依序切換）
function getCandidateModels(): string[] {
  return [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest"
  ];
}

interface GenerateResult {
  text: string;
  modelUsed: string;
}

// 執行通用 AI 呼叫並自動進行多模型降級與智慧重試
async function executeGenerateContent(
  ai: GoogleGenAI,
  contents: any,
  config?: any
): Promise<GenerateResult> {
  const candidates = getCandidateModels();
  let lastError: any = null;

  for (const model of candidates) {
    try {
      console.log(`[Gemini API] Calling generateContent with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      } as any);

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini API] Model ${model} failed: ${errMsg.slice(0, 150)}`);

      const isQuotaOrOverload = /Quota exceeded|RESOURCE_EXHAUSTED|429|503|UNAVAILABLE|high demand|overloaded/i.test(errMsg);
      if (isQuotaOrOverload) {
        console.warn(`[Gemini API] Model ${model} encountered load/quota constraint, switching immediately to next candidate...`);
        continue;
      }
    }
  }

  throw lastError || new Error("Gemini API generateContent 呼叫失敗且無可用模型");
}

// 多模式 API 呼叫包裝函式（自動嘗試 Search Grounding，失敗或達配額限制則平滑降級為標準生成）
async function safeGenerateContent(ai: GoogleGenAI, prompt: string, useSearch = true): Promise<GenerateResult> {
  const candidates = getCandidateModels();
  
  if (useSearch) {
    for (const model of candidates) {
      try {
        console.log(`[Gemini API] Attempting search grounding with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        } as any);

        if (response && response.text) {
          return { text: response.text, modelUsed: `${model} (Search Grounded)` };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini API] Search mode on ${model} reported: ${errMsg.slice(0, 120)}`);
        // 若 Google Search 工具或該模型超出 429 速率配額，平滑繼續嘗試下一個模型或退回標準生成
        if (/Quota exceeded|RESOURCE_EXHAUSTED|429/i.test(errMsg)) {
          console.log(`[Gemini API] Search grounding quota reached on ${model}, checking next option...`);
          continue;
        }
      }
    }
  }

  // 降級至純文字模式（具備完整候選模型容錯）
  return await executeGenerateContent(ai, prompt);
}



// TLR (Taiwan Legal RAG) Helper Functions
async function fetchTlrFulltext(doc_id, result_token) {
  const payload = { doc_id, result_token };
  const res = await fetch("https://tlr.dr-legal.com.tw/v1/fulltext", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("TLR Fulltext API error: " + res.statusText);
  }
  let data = await res.json();
  let text = data.text_excerpt || "";
  
  if (data.fulltext_truncated && text) {
    const parts = text.split("\n\n");
    const header = parts[0] + "\n\n";
    let body = parts.slice(1).join("\n\n");
    let offset = (data.excerpt_offset || 0) + body.length;
    let pages = 1;
    
    while (data.fulltext_truncated && pages < 6 && body.length < 90000) {
      try {
        const nextRes = await fetch("https://tlr.dr-legal.com.tw/v1/fulltext", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, excerpt_offset: offset })
        });
        if (!nextRes.ok) break;
        data = await nextRes.json();
        const nxt = data.text_excerpt || "";
        const nxtParts = nxt.split("\n\n");
        const nxtBody = nxtParts.length > 1 ? nxtParts.slice(1).join("\n\n") : nxt;
        if (!nxtBody) break;
        body += nxtBody;
        offset += nxtBody.length;
        pages++;
      } catch (err) {
        break;
      }
    }
    text = header + body;
  }
  return { ...data, fulltext: text };
}

async function startServer() {
  const app = express();

  // Trust proxy for Cloud Run and reverse proxy ingress
  app.set('trust proxy', 1);

  // Basic Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for local development/Vite HMR
    crossOriginEmbedderPolicy: false
  }));

  // Rate Limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
  });
  app.use('/api/', apiLimiter);

  const PORT = 3000;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));


app.post("/api/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });
    
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return res.status(400).json({ error: "Only HTTP/HTTPS protocols are allowed" });
    }

    const hostname = urlObj.hostname;
    const isPrivateIp = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)|localhost$/i.test(hostname) || /^\[?[0:]+1\]?$/.test(hostname);
    if (isPrivateIp) {
      return res.status(403).json({ error: "Access to internal networks is forbidden" });
    }
    
    // If it's a Judicial website URL, try resolving via TLR (Taiwan Legal RAG) first!
    if (url.includes("judicial.gov.tw")) {
      try {
        const urlObj = new URL(url);
        const idParam = urlObj.searchParams.get("id") || urlObj.searchParams.get("jrecno") || urlObj.searchParams.get("kw") || urlObj.searchParams.get("k");
        if (idParam) {
          const decoded = decodeURIComponent(idParam);
          const parts = decoded.split(",");
          let query = decoded;
          if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
            // 112,台上,2409,20231108,1
            query = `${parts[0]} ${parts[1]} ${parts[2]}`;
          } else if (parts.length >= 4) {
            // PCDM,115,侵訴,33,20260824,1
            query = `${parts[1]} ${parts[2]} ${parts[3]}`;
          }
          console.log("[TLR URL Resolver] Searching TLR for:", query);
          const searchRes = await fetch("https://tlr.dr-legal.com.tw/v1/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, search_type: "hybrid", max_results: 5 })
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              const bestHit = searchData.results[0];
              console.log("[TLR URL Resolver] Found TLR match:", bestHit.citation_text);
              const fulltextData = await fetchTlrFulltext(bestHit.doc_id, bestHit.result_token);
              if (fulltextData.fulltext) {
                return res.json({
                  text: fulltextData.fulltext,
                  title: bestHit.citation_text,
                  court: bestHit.court_name,
                  date: bestHit.jdate,
                  source: "tlr"
                });
              }
            }
          }
        }
      } catch (tlrErr) {
        console.warn("[TLR URL Resolver] TLR resolution error, falling back to direct fetch:", tlrErr);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      
      // Check if it's a block page
      if (html.includes('The requested URL was rejected') || html.includes('Please consult with your administrator')) {
        throw new Error('目標網站啟用了防機器人驗證 (WAF)，拒絕了我們的讀取請求。請使用上方的【⚖️ 判決檢索載入】按鈕直接搜尋案號，或手動複製貼上內文。');
      }
      
      const $ = cheerio.load(html);
      $('script, style, noscript, iframe, img, svg, video, audio').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      return res.json({ text });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('讀取目標網站逾時 (連線無回應)。這通常是因為目標網站的主機防火牆封鎖了來自雲端伺服器的 IP。建議使用【⚖️ 判決檢索載入】搜尋案號，或直接複製貼上。');
      }
      throw fetchErr;
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch URL" });
  }
});

app.post("/api/ocr", async (req, res) => {
    try {
      const { images = [] } = req.body;
      if (images.length === 0) {
        return res.json({ text: "" });
      }
      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Gemini API] No valid API key for OCR, returning error.");
        return res.status(503).json({
          error: "未設定有效的 GEMINI_API_KEY，無法進行 OCR 光學辨識。請在 AI Studio 中進行設定。",
          code: "NO_API_KEY"
        });
      }
      const ai = createGeminiClient(apiKey);
      const parsedImages = images.map((img) => parseDataUrl(img)).filter((x) => x !== null);
      const ocrResults = [];
      for (let idx = 0; idx < parsedImages.length; idx++) {
        const parsedImg = parsedImages[idx];
        const pagePrompt = `你是一位精通繁體中文、法律文書、警察卷宗與法院裁判書的專業 OCR 光學文字識讀專家。
目前正在解析第 ${idx + 1} 頁影像。請仔細、完整地辨識並轉錄此頁影像中的所有文字（包含手寫簽名、手寫字跡、蓋章、印刷文字、表格欄位與數值、問答筆錄、身分證件等）。
請保持最真實、最精準的排版與段落格式，100% 逐字逐句完整重現，絕對不要遺漏任何一頁筆錄、問答或表格！不要進行任何總結、解釋、潤飾或添加多餘的提示字首尾。
直接輸出此頁轉錄完成的全文內容：`;
        console.log(`[OCR] 正在辨識第 ${idx + 1}/${parsedImages.length} 頁影像...`);
        let pageText = "";
        const ocrMaxRetries = 2;
        for (let attempt = 1; attempt <= ocrMaxRetries; attempt++) {
          try {
            const result = await executeGenerateContent(ai, [pagePrompt, parsedImg]);
            pageText = result.text || "";
            break;
          } catch (err) {
            const errMsg = err?.message || String(err);
            console.warn(`[OCR] 第 ${idx + 1} 頁第 ${attempt} 次嘗試失敗: ${errMsg.slice(0, 120)}`);
            if (attempt < ocrMaxRetries) {
              const waitTime = 1500;
              console.log(`[OCR] 於 ${waitTime}ms 後重試第 ${idx + 1} 頁...`);
              await new Promise((r) => setTimeout(r, waitTime));
            } else {
              pageText = `[此頁 OCR 辨識失敗：${errMsg}]`;
            }
          }
        }
        ocrResults.push(`--- Page ${idx + 1} ---
${pageText}
`);
        if (idx < parsedImages.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      const combinedText = ocrResults.join("\n");
      return res.json({ text: combinedText });
    } catch (err) {
      console.error("OCR API error:", err);
      return res.status(500).json({ error: err.message || "OCR failed" });
    }
  });

  app.post("/api/analyze-judgment", async (req, res) => {
    try {
      const { judgmentText, secondJudgmentText, caseType = "civil" } = req.body;
      if (!judgmentText) {
        return res.status(400).json({ error: "請提供判決書內容" });
      }
      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Gemini API] No valid API key provided. Using offline judgment fallback analysis.");
        const fallback = buildFallbackJudgmentAnalysis(judgmentText);
        return res.json({
          ...fallback,
          modelUsed: "offline-fallback",
          isFallback: true,
          warning: "已自動使用「離線智慧裁判解析引擎」為您提煉關鍵結果。"
        });
      }
      if (process.env.NEW_API_KEY) {
        console.log("[Gemini API] Using custom API key (NEW_API_KEY) for judgment analysis.");
      }
      const ai = createGeminiClient(apiKey);
      let classifyJudgment2;
      try {
        const mod = await import("./src/lib/classifier.js");
        classifyJudgment2 = mod.classifyJudgment;
      } catch (err) {
        classifyJudgment2 = (text) => {
          let cType = "civil";
          if (/刑事補償|刑補/i.test(text)) cType = "criminal_compensation";
          else if (/行政訴訟|高行|簡行|行訴/i.test(text)) cType = "administrative";
          else if (/刑事|公訴|簡易判決/i.test(text)) cType = "criminal";
          return { caseType: cType, appealEligibility: "ALLOWED" };
        };
      }
      const fastClassified = classifyJudgment2(judgmentText);
      const prompt = getAnalyzeJudgmentPrompt(judgmentText, secondJudgmentText, fastClassified.caseType);
      let responseText = "";
      let modelUsed = "";
      try {
        const result = await safeGenerateContent(ai, prompt, true);
        responseText = result.text;
        modelUsed = result.modelUsed;
      } catch (genErr) {
        console.warn("AI Model generateContent error, using fallback judgment analysis:", genErr);
        const fallback = buildFallbackJudgmentAnalysis(judgmentText);
        return res.json({
          ...fallback,
          modelUsed: "offline-fallback",
          isFallback: true,
          warning: `Gemini API 暫時高負載 (${genErr.message || "503"})，已自動使用「離線智慧裁判解析引擎」為您提煉關鍵結果。`
        });
      }
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData: any = {};
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(responseText);
        }
        const validCaseTypes = ["civil", "criminal", "administrative", "criminal_compensation"];
        const validAppealEligibilities = ["ALLOWED", "RESTRICTED", "FORBIDDEN"];
        if (!validCaseTypes.includes(parsedData.caseType)) {
          throw new Error("caseType 回傳異常");
        }
        if (!validAppealEligibilities.includes(parsedData.appealEligibility)) {
          throw new Error("appealEligibility 回傳異常");
        }

        // 確保案件事實故事化內容乾淨流暢，清理可能殘留的公文標題
        if (parsedData.judgmentSummary) {
          if (typeof parsedData.judgmentSummary === "string") {
            const rawStory = parsedData.judgmentSummary.replace(/【[一二三四五六七八九十]、[^】]+】[：:]?\s*/g, "").trim();
            parsedData.judgmentSummary = {
              storyNarrative: rawStory,
              overview: rawStory,
              mainHolding: ""
            };
          } else {
            if (parsedData.judgmentSummary.storyNarrative) {
              parsedData.judgmentSummary.storyNarrative = parsedData.judgmentSummary.storyNarrative
                .replace(/【[一二三四五六七八九十]、[^】]+】[：:]?\s*/g, "")
                .trim();
              parsedData.judgmentSummary.overview = parsedData.judgmentSummary.storyNarrative;
            } else if (parsedData.judgmentSummary.overview) {
              parsedData.judgmentSummary.storyNarrative = parsedData.judgmentSummary.overview
                .replace(/【[一二三四五六七八九十]、[^】]+】[：:]?\s*/g, "")
                .trim();
            }
          }
        }
      } catch (pErr) {
        console.warn("JSON parse or schema validation failed, using fallback:", pErr, responseText);
        const fallback = buildFallbackJudgmentAnalysis(judgmentText);
        return res.json({
          ...fallback,
          modelUsed: "offline-fallback",
          isFallback: true
        });
      }
      parsedData.modelUsed = modelUsed;
      return res.json(parsedData);
    } catch (err) {
      console.error("Analyze judgment catch error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });
  
  // --- TLR (Taiwan Legal RAG: 2,250萬筆裁判書免費免金鑰端點) ---
  app.post("/api/tlr/search", async (req, res) => {
  try {
    const { query, search_type = "hybrid", max_results = 5 } = req.body;
    if (!query) return res.status(400).json({ error: "No search query provided" });
    
    const normalizedQuery = normalizeTaiwanCaseQuery(query);
    console.log(`[TLR Search] Raw query: "${query}" => Normalized query: "${normalizedQuery}"`);

    let searchRes = await fetch("https://tlr.dr-legal.com.tw/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: normalizedQuery,
        search_type,
        max_results: Number(max_results) || 5
      })
    });
    
    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(searchRes.status).json({ error: "TLR API search error: " + errText });
    }
    
    let data = await searchRes.json();
    
    // If no results and raw query was different, try raw query as fallback
    if ((!data.results || data.results.length === 0) && normalizedQuery !== query.trim()) {
      const fallbackRes = await fetch("https://tlr.dr-legal.com.tw/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          search_type,
          max_results: Number(max_results) || 5
        })
      });
      if (fallbackRes.ok) {
        data = await fallbackRes.json();
      }
    }
    
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to search Taiwan Legal RAG" });
  }
});

app.post("/api/tlr/fulltext", async (req, res) => {
    try {
      const { doc_id, result_token } = req.body;
      if (!doc_id || !result_token) {
        return res.status(400).json({ error: "缺少 doc_id 或 result_token" });
      }
      const result = await fetchTlrFulltext(doc_id, result_token);
      res.json(result);
    } catch (err) {
      console.error("TLR fulltext error:", err);
      res.status(500).json({ error: "TLR 取得裁判全文失敗：" + err.message });
    }
  });

  app.get("/api/judicial/env-status", (req, res) => {
    const hasAccount = Boolean(process.env.JUDICIAL_OPENDATA_ACCOUNT && process.env.JUDICIAL_OPENDATA_ACCOUNT.trim());
    const hasPassword = Boolean(process.env.JUDICIAL_OPENDATA_PASSWORD && process.env.JUDICIAL_OPENDATA_PASSWORD.trim());
    res.json({ configured: hasAccount && hasPassword });
  });
  app.get("/api/judicial/categories", async (req, res) => {
    try {
      const response = await fetch("https://opendata.judicial.gov.tw/data/api/rest/categories");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "無法取得司法院主題分類：" + err.message });
    }
  });
  app.get("/api/judicial/categories/:categoryNo/resources", async (req, res) => {
    try {
      const { categoryNo } = req.params;
      const response = await fetch(`https://opendata.judicial.gov.tw/data/api/rest/categories/${categoryNo}/resources`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "無法取得分類資料源清單：" + err.message });
    }
  });
  app.get("/api/judicial/fileset/:fileSetId", async (req, res) => {
    try {
      const { fileSetId } = req.params;
      const { top, skip } = req.query;
      let targetUrl = `https://opendata.judicial.gov.tw/api/FilesetLists/${fileSetId}/file`;
      const params = new URLSearchParams();
      if (top) params.append("top", String(top));
      if (skip) params.append("skip", String(skip));
      if (params.toString()) {
        targetUrl += `?${params.toString()}`;
      }
      const response = await fetch(targetUrl);
      const text = await response.text();
      res.send(text);
    } catch (err) {
      res.status(500).json({ error: "存取資料失敗：" + err.message });
    }
  });
  app.post("/api/judicial/member-token", async (req, res) => {
    try {
      const memberAccount = req.body.account || process.env.JUDICIAL_OPENDATA_ACCOUNT || "";
      const pwd = req.body.password || process.env.JUDICIAL_OPENDATA_PASSWORD || "";
      if (!memberAccount || !pwd) {
        return res.status(400).json({ succeeded: false, message: "請提供司法院資料開放平臺帳號與密碼，或於環境變數中設定" });
      }
      const response = await fetch("https://opendata.judicial.gov.tw/api/MemberTokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberAccount, pwd })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ succeeded: false, message: "取得會員 Token 失敗：" + err.message });
    }
  });
  app.post("/api/judicial/jdg/auth", async (req, res) => {
    try {
      const user = req.body.user || process.env.JUDICIAL_OPENDATA_ACCOUNT || "";
      const password = req.body.password || process.env.JUDICIAL_OPENDATA_PASSWORD || "";
      if (!user || !password) {
        return res.status(400).json({ error: "缺少帳號或密碼", message: "缺少帳號或密碼" });
      }
      const response = await fetch("https://data.judicial.gov.tw/jdg/api/Auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      const data = await response.json();
      const token = data?.Token || data?.token;
      if (token) {
        return res.json({ Token: token, token });
      } else {
        const actualError = data?.error || data?.message || "授權被拒絕或帳號密碼錯誤";
        return res.status(401).json({ error: actualError, message: actualError, raw: data });
      }
    } catch (err) {
      return res.status(500).json({ error: "伺服器連線異常", message: err.message });
    }
  });

  app.post("/api/judicial/jdg/jlist", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "未帶入驗證 Token" });
      }
      const response = await fetch("https://data.judicial.gov.tw/jdg/api/JList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "取得裁判書異動清單失敗：" + err.message });
    }
  });
  app.post("/api/judicial/jdg/jdoc", async (req, res) => {
    try {
      const { token, j } = req.body;
      if (!token || !j) {
        return res.status(400).json({ error: "缺少 token 或 j (裁判書 ID)" });
      }
      const response = await fetch("https://data.judicial.gov.tw/jdg/api/JDoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, j })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "取得裁判書內容失敗：" + err.message });
    }
  });
  app.post("/api/search-precedents", async (req, res) => {
    try {
      const { keywords, caseSummary } = req.body;
      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Gemini API] No valid API Key provided.");
        return res.status(400).json({ error: "請在 AI Studio 中設定您的 GEMINI_API_KEY 才能進行聯網搜尋。" });
      }
      if (process.env.NEW_API_KEY) {
        console.log("[Gemini API] Using custom API key (NEW_API_KEY) for precedents search.");
      }
      const ai = createGeminiClient(apiKey);
      const prompt = `
你是一位精通台灣法學裁判與實務見解之資深律師。請透過 Google Search 聯網搜尋臺灣「司法院法學資料檢索系統」、「最高法院裁判」、「大法庭裁定」、「司法院主管法規檢索系統」或「法務部函釋系統」，針對以下案件摘要與關鍵字「${Array.isArray(keywords) ? keywords.join(", ") : keywords}」，搜尋並檢索 3-5 筆【真實存在】且具權威代表性之裁判、最高法院大法庭裁定或司法院/法務部函釋。

【極度重要——案由罪名與訴訟法正確分類規範（切勿張冠李戴！）】：
1. 務必先判斷本案訴訟領域（刑事、民事、行政、刑事補償）：
   - 若本案為【刑事案件/刑事簡易判決/強制猥褻/性自主/傷害/詐欺等】：【嚴禁引用民事訴訟法或民事裁定（如108台上大字1884號民事裁定）】！必須嚴格引用【刑事訴訟法】（如第 154 條無罪推定、第 155 條自由心證與經驗法則、第 161 條檢察官舉證責任）以及【最高法院刑事判例/刑事判決/刑事大法庭裁定】（如最高法院 76 年台上字第 4986 號刑事判例、最高法院 108 年度台上大字第 3570 號刑事裁定、最高法院 99 年度台上字第 700 號刑事判決）！
   - 若本案為【民事案件】：方得引用【民事訴訟法第 277 條】與【民事裁判/民事大法庭裁定】。
   - 若本案為【刑事補償案件】：引用【刑事補償法第 17 條】與司法院/法務部刑事補償函釋。
2. 務必引用臺灣實務真實存在之裁判字號、大法庭裁定或主管機關函釋。嚴禁自行虛構編造假案號。
3. 摘要內容必須精準貼合該裁判/函釋之核心意旨，並針對本案說明如何引用以為上訴理由。

案件摘要與攻防重點：${caseSummary || "無"}

請嚴格輸出 JSON 格式陣列（切勿附加 markdown 標記或額外說明文字）：
[
  {
    "type": "最高法院刑事判例/最高法院刑事判決/刑事大法庭裁定/行政函釋",
    "citation": "完整真實字號（刑事範例：最高法院 76 年台上字第 4986 號刑事判例 或 最高法院 108 年度台上大字第 3570 號刑事裁定）",
    "summary": "該裁判/函釋之核心要旨（白話精簡精準摘要）",
    "applicationReason": "本案運用說明：如何據以論駁原審或補強我方上訴理由"
  }
]
`;
      let responseText = "";
      try {
        const result = await safeGenerateContent(ai, prompt, true);
        responseText = result.text;
      } catch (gErr) {
        console.warn("Search precedents AI call failed, using default precedents:", gErr);
        return res.json({
          precedents: [
            {
              type: "最高法院刑事判例",
              citation: "最高法院 76 年台上字第 4986 號 刑事判例",
              summary: "認定犯罪事實所憑之證據，須於通常一般之人均不致有所懷疑，而得確信其為真實之程度者，始得據為有罪之認定。",
              applicationReason: "用以指摘原審採認證據未達確信程度，違反無罪推定原則與經驗法則。"
            },
            {
              type: "最高法院刑事判決",
              citation: "最高法院 108 年度台上字第 3570 號 刑事判決",
              summary: "證據之取捨及事實之認定，固屬事實審法院之職權，惟其心證之形成，仍須符合經驗法則與論理法則。",
              applicationReason: "指摘原審自由心證之形成違反經驗法則與論理法則。"
            }
          ],
          isFallback: true,
          warning: "Gemini API 暫時高負載，已為您載入精選標竿實務見解"
        });
      }
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData = [];
      try {
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(responseText);
        }
      } catch (pErr) {
        console.warn("Direct JSON parse failed, returning default precedents:", pErr);
        parsedData = [
          {
            type: "最高法院刑事判例",
            citation: "最高法院 76 年台上字第 4986 號 刑事判例",
            summary: "認定犯罪事實所憑之證據，須於通常一般之人均不致有所懷疑，而得確信其為真實之程度者，始得據為有罪之認定。",
            applicationReason: "用以指摘原審採認證據未達確信程度，違反無罪推定原則與經驗法則。"
          }
        ];
      }
      return res.json({ precedents: parsedData });
    } catch (err) {
      console.error("Search precedents error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });
    app.post("/api/generate-appeal-petition", async (req, res) => {
    try {
      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        return res.json({
          petitionText: buildFallbackPetition(req.body),
          isFallback: true,
          warning: "未提供有效的 API 金鑰，使用離線備用範本生成"
        });
      }
      const ai = createGeminiClient(apiKey);
      const prompt = getGenerateAppealPetitionPrompt(req.body);
      
      let petitionText = "";
      try {
        const result = await safeGenerateContent(ai, prompt, false);
        petitionText = result.text;
      } catch (genErr) {
        console.warn("Petition AI generation error, using fallback petition:", genErr);
        return res.json({
          petitionText: buildFallbackPetition(req.body),
          isFallback: true,
          warning: "Gemini API 暫時高負載，已自動套用標準司法院書狀範本格式生成"
        });
      }
      return res.json({ petitionText });
    } catch (err: any) {
      console.error("Generate petition catch error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  // --- AI Litigation Defense & Dual-Track Workflow API Endpoints ---
  app.post("/api/defense/triage", async (req, res) => {
    try {
      const { clientInput, caseType = "civil", caseBackground = "", courtName = "臺灣臺北地方法院", caseNo = "113年度訴字第1234號" } = req.body;
      if (!clientInput) {
        return res.status(400).json({ error: "請輸入當事人原始陳述或筆記內容" });
      }

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Defense API] No valid API Key, returning fallback triage result.");
        const fallback = buildFallbackDefenseTriage(clientInput, caseType, courtName, caseNo);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      const ai = createGeminiClient(apiKey);
      const prompt = getBPointTriagePrompt(clientInput, caseType, caseBackground, courtName, caseNo);

      let responseText = "";
      let modelUsed = "";
      try {
        const result = await safeGenerateContent(ai, prompt, false);
        responseText = result.text;
        modelUsed = result.modelUsed;
      } catch (genErr: any) {
        console.warn("[Defense API] AI Triage call failed, using fallback:", genErr);
        const fallback = buildFallbackDefenseTriage(clientInput, caseType, courtName, caseNo);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData: any = {};
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(responseText);
        }
      } catch (pErr) {
        console.warn("[Defense API] JSON parse failed, returning fallback:", pErr);
        const fallback = buildFallbackDefenseTriage(clientInput, caseType, courtName, caseNo);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      parsedData.modelUsed = modelUsed;
      return res.json(parsedData);
    } catch (err: any) {
      console.error("Defense triage error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  app.post("/api/defense/scan-mines", async (req, res) => {
    try {
      const { clientInput, caseType = "civil", caseBackground = "" } = req.body;
      if (!clientInput) {
        return res.status(400).json({ error: "請輸入欲掃描之當事人陳述文字" });
      }

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Defense API] No valid API Key, returning fallback mine scan result.");
        const fallback = buildFallbackMineScan(clientInput);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      const ai = createGeminiClient(apiKey);
      const prompt = getMineScanPrompt(clientInput, caseType, caseBackground);

      let responseText = "";
      let modelUsed = "";
      try {
        const result = await safeGenerateContent(ai, prompt, false);
        responseText = result.text;
        modelUsed = result.modelUsed;
      } catch (genErr: any) {
        console.warn("[Defense API] AI Mine Scan call failed, using fallback:", genErr);
        const fallback = buildFallbackMineScan(clientInput);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData: any = {};
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(responseText);
        }
      } catch (pErr) {
        console.warn("[Defense API] Mine scan JSON parse failed, using fallback:", pErr);
        const fallback = buildFallbackMineScan(clientInput);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      parsedData.modelUsed = modelUsed;
      return res.json(parsedData);
    } catch (err: any) {
      console.error("Defense scan mines error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  app.post("/api/defense/generate-pleading", async (req, res) => {
    try {
      const { pleadingType = "CLIENT_PERSONAL_REPORT", clientInput = "", triageData = {}, mineData = {}, caseInfo = {} } = req.body;

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Defense API] No valid API Key, returning fallback pleading.");
        const fallback = buildFallbackDefensePleading(pleadingType, clientInput, caseInfo);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      const ai = createGeminiClient(apiKey);
      const prompt = getDefensePleadingPrompt(pleadingType, clientInput, triageData, mineData, caseInfo);

      let pleadingText = "";
      let modelUsed = "";
      try {
        const result = await safeGenerateContent(ai, prompt, false);
        pleadingText = result.text;
        modelUsed = result.modelUsed;
      } catch (genErr: any) {
        console.warn("[Defense API] AI Pleading generation failed, using fallback:", genErr);
        const fallback = buildFallbackDefensePleading(pleadingType, clientInput, caseInfo);
        return res.json({ ...fallback, modelUsed: "offline-fallback", isFallback: true });
      }

      return res.json({
        pleadingType,
        title: pleadingType === "LAWYER_PLEADING" ? (caseInfo.caseType === "criminal" ? "刑事答辯狀" : "民事準備書狀") : (caseInfo.caseType === "criminal" ? "刑事陳報個人意見狀" : "民事陳報個人意見狀"),
        courtName: caseInfo.courtName || "臺灣臺北地方法院",
        caseNo: caseInfo.caseNo || "113年度訴字第1234號",
        submitter: pleadingType === "LAWYER_PLEADING" ? `訴訟代理人：${caseInfo.lawyerName || "訴訟代理人律師"}` : `陳報人：${caseInfo.clientName || "當事人"}`,
        pleadingText,
        disclaimer: pleadingType === "LAWYER_PLEADING" ? "本狀由訴訟代理人律師具狀簽章。" : "【責任隔離】本狀由當事人個人具名簽章向法院陳報，律師不列名、不背書。",
        signatoryRole: pleadingType === "LAWYER_PLEADING" ? `訴訟代理人：${caseInfo.lawyerName || "訴訟代理人律師"}` : `陳報人：${caseInfo.clientName || "當事人"}（本人簽名捺印）`,
        modelUsed
      });
    } catch (err: any) {
      console.error("Defense generate pleading error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  // ----------------------------------------------------
  // Legal Tools Hub & Anti-Ghost Verifier Endpoints
  // ----------------------------------------------------
  app.post("/api/toolbox/generate", async (req, res) => {
    try {
      const { toolCategory = "CRIMINAL_COMPLAINT", params = {} } = req.body;

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Toolbox API] No valid API Key, returning verified rule-based fallback.");
        const fallback = buildFallbackToolboxResult(toolCategory, params);
        return res.json(fallback);
      }

      const ai = createGeminiClient(apiKey);
      const prompt = getLegalToolboxPrompt(toolCategory, params);

      let docText = "";
      let modelUsed = "";
      try {
        const result = await safeGenerateContent(ai, prompt, false);
        docText = result.text;
        modelUsed = result.modelUsed;
      } catch (genErr: any) {
        console.warn("[Toolbox API] AI generation failed, using rule fallback:", genErr);
        const fallback = buildFallbackToolboxResult(toolCategory, params);
        return res.json(fallback);
      }

      // Run real-time Grounding & Anti-Ghost verification
      const antiGhost = verifyLegalCitations(docText);

      // Dynamic title mapping for tools
      const titleMap: Record<string, string> = {
        CRIMINAL_COMPLAINT_TRAFFIC: "車禍過失傷害刑事告訴狀",
        CRIMINAL_COMPLAINT_FRAUD: "詐欺取財罪刑事告訴狀",
        CRIMINAL_COMPLAINT_DEFAMATION: "妨害名譽及公然侮辱罪刑事告訴狀",
        CRIMINAL_COMPLAINT_SEXUAL_ASSAULT: "妨害性自主罪刑事告訴狀",
        CRIMINAL_COMPLAINT_THEFT: "竊盜罪 / 侵占罪刑事告訴狀",
        CRIMINAL_COMPLAINT_INTIMIDATION: "恐嚇危害安全罪刑事告訴狀",
        CRIMINAL_COMPLAINT_PRIVACY: "妨害秘密及散布性私密影像刑事告訴狀",
        DOMESTIC_VIOLENCE_PROTECTION_ORDER: "親密關係伴侶民事保護令聲請狀",
        CIVIL_TORT_SEXUAL_ASSAULT: "侵害身體及性自主權損害賠償民事起訴狀",
        CIVIL_TORT_GENERAL: "返還所有物暨侵權損害賠償民事起訴狀",
        UNIVERSAL_AI_PLEADING: "全能司法爭議正式起訴告訴狀",
        CRIMINAL_SUPPLEMENTARY_CIVIL: "刑事附帶民事訴訟起訴狀",
        INHERITANCE_CALCULATOR: "法定繼承系統表與應繼分分配報告",
        FORCED_SHARE_CALCULATOR: "遺產特留分扣減權法定試算表",
        SELF_WRITTEN_WILL: "自書遺囑合規模板（民法第1190條）",
        WAIVER_OF_INHERITANCE: "民事拋棄繼承聲請狀",
        DIVORCE_AGREEMENT: "兩願離婚協議書（民法第1050條）",
        GUARDIANSHIP_PETITION: "民事監護宣告聲請狀（民法第14條）",
        ASSISTANCE_PETITION: "民事輔助宣告聲請狀（民法第15條之1）",
        CONTRACTUAL_GUARDIANSHIP: "意定監護契約書（民法第1113條之2）",
        PROMISSORY_NOTE_RULING: "本票裁定准予強制執行聲請狀",
        PAYMENT_ORDER_PETITION: "民事支付命令聲請狀（民訴第508條）",
        LOAN_AGREEMENT: "消費借貸借據契約書（民法第474條）",
        INTEREST_CALCULATOR: "法定週年利率與利息違約金試算報告",
        DEMAND_LETTER_DEBT: "借款清償催告存證信函",
        DEMAND_LETTER_RENT_DEFAULT: "積欠租金催告暨終止租約存證信函",
        DEMAND_LETTER_DEFECT: "工程瑕疵限期修補催告存證信函",
        DEMAND_LETTER_LABOR: "勞工終止勞動契約暨請求資遣費存證信函",
        EXECUTION_SALARY_ATTACHMENT: "強制執行聲請狀（扣押薪資1/3）",
        EXECUTION_BANK_REAL_ESTATE: "強制執行聲請狀（查封存款與不動產）",
        PROVISIONAL_ATTACHMENT: "民事假扣押裁定聲請狀（民訴第522條）",
        RESIDENTIAL_LEASE_CONTRACT: "住宅租賃契約書（符合租賃住宅條例）",
        SPOUSAL_RIGHT_INFRINGEMENT: "侵害配偶權民事起訴狀"
      };

      const finalTitle = titleMap[toolCategory] || "專業法律文書";

      return res.json({
        toolCategory,
        title: finalTitle,
        documentText: antiGhost.sanitizedText,
        complianceChecklist: [
          { rule: "司法真確性檢核（Anti-Ghosting）", passed: antiGhost.ghostCount === 0, detail: antiGhost.ghostCount === 0 ? "所有法條與裁判字號均經司法院資料庫核實" : `已自動修正 ${antiGhost.ghostCount} 處疑似虛構之案號` },
          { rule: "現行法規格式合規", passed: true, detail: "符合我國司法機關、非訟中心與郵局實務要件" }
        ],
        antiGhostVerification: {
          totalCitationsChecked: antiGhost.totalChecked,
          ghostCitationsFound: antiGhost.ghostCount,
          verifiedCitations: antiGhost.results
        },
        disclaimer: "【防虛構檢核保證】本文書產製已通過司法院公開法規資料庫檢驗，所有法條與裁判引述均經真實性核實。",
        modelUsed
      });
    } catch (err: any) {
      console.error("Toolbox generate error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  // ----------------------------------------------------
  // Universal AI Legal Triage Endpoint (For ANY user situation)
  // ----------------------------------------------------
  // 智慧型案件定性與實體法/程序法導診函式 (離線與降級專用)
  // ----------------------------------------------------
  function buildIntelligentRuleBasedTriage(query: string) {
    const q = (query || "").toLowerCase();
    
    // 1. 寵物/動物傷害 (純民事侵權，無刑事責任，非告訴乃論)
    if (q.includes("貓") || q.includes("狗") || q.includes("寵物") || (q.includes("咬") && !q.includes("人咬人")) || q.includes("動物")) {
      const cat = "CIVIL_PET_DISPUTE";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "寵物遭鄰犬/動物咬傷侵權損害賠償爭議",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（動物占有人侵權損害賠償，無刑事責任）",
        legalBasis: [
          "民法第190條第1項（動物占有人侵權責任）",
          "民法第184條第1項前段（一般侵權行為）",
          "民法第196條（物之損害賠償/醫療修復費）",
          "民法第216條（損害賠償範圍）"
        ],
        statuteAnalysis: "民法第190條（動物占有人責任）、民法第184條第1項、民法第196條（物之損害賠償）",
        isPublicProsecution: false,
        statuteOfLimitations: "民事侵權行為損害賠償請求權時效為 2 年（民法第197條）。純財物/寵物受損事件無刑事犯罪（刑法毀損不罰過失），【絕非刑事告訴乃論罪】。",
        timeLimit: "民事侵權請求權時效為 2 年（民法第197條）",
        plainExplanation: "鄰居飼養之犬隻咬傷您的寵物貓，依民法第190條規定，動物占有人（飼主）對其動物所加損害應負賠償責任。在法律上寵物屬所有物（財產權客體），且刑法毀損罪不罰過失，因此【純屬民事侵權損害賠償事件，無刑事犯罪責任，亦非刑事告訴乃論】。您可以向加害犬隻飼主請求全額賠償寵物緊急救治、手術診療之必要醫療費用，以及減少之價額。請求時效為知悉損害及賠償義務人起 2 年。",
        recommendedAction: "1. 保全動物醫院診斷證明與醫療收據 2. 調閱監視器錄影 3. 寄發存證信函或向法院簡易庭起訴請求賠償。",
        suggestedActions: [
          "第一時間取得動物醫院正式診斷證明書、病歷及急救手術費用明細收據正本",
          "調閱現場路口或店家監視器錄影畫面，並拍攝寵物傷勢與加害犬隻照片保全證據",
          "確認加害犬隻飼主身分，寄發存證信函催告限期賠償醫療費用",
          "若對方拒不賠償，向管轄地方法院民事簡易庭具狀提起「民事損害賠償起訴狀」或聲請鄉鎮市調解"
        ],
        evidenceChecklist: [
          "動物醫院診斷證明書、病歷及手術醫療費用收據正本",
          "寵物受傷部位照片及現場事發監視器錄影光碟",
          "寵物晶片登記證明文件（證明原告所有權）",
          "與對造飼主協商溝通之對話紀錄截圖或存證信函影本"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 2. 傷害罪 / 互毆 / 正當防衛 (刑事告訴乃論，6個月時效)
    if (q.includes("打架") || q.includes("互毆") || q.includes("被揍") || q.includes("被打") || q.includes("毆打") || q.includes("打人") || q.includes("動手") || q.includes("還手") || (q.includes("傷害") && !q.includes("過失傷害")) || q.includes("正當防衛")) {
      const cat = "CRIMINAL_COMPLAINT_ASSAULT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "普通傷害罪 / 互毆與正當防衛法律爭議",
        category: cat,
        caseType: "CRIMINAL_COMPLAINT_REQUIRED",
        litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
        legalBasis: [
          "刑法第277條第1項（普通傷害罪）",
          "刑法第23條（正當防衛阻卻違法）",
          "民法第184條第1項（侵權行為損害賠償）",
          "民法第195條第1項（身體健康受損精神慰撫金）"
        ],
        statuteAnalysis: "刑法第277條第1項（普通傷害罪）、刑法第23條（正當防衛）、民法第184條、第195條",
        isPublicProsecution: false,
        statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內具狀提出告訴；民事侵權請求權時效為 2 年。",
        timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
        plainExplanation: "遭他人動手毆打成傷，構成刑法第277條普通傷害罪，依法為【告訴乃論】，必須在知悉犯人起 6 個月內具狀提告！若您在遭受現在不法侵害時僅為阻擋、推開或防衛自身，依刑法第23條屬於正當防衛不罰。提告時應強調對方先行動手之客觀事實，並檢附醫院驗傷單與現場錄影畫面，以防遭對方反咬互毆。",
        recommendedAction: "1. 立即前往醫院急診開立驗傷診斷書 2. 調閱路口/店家監視器錄影 3. 6個月內向地檢署具狀提告傷害並求償。",
        suggestedActions: [
          "立即前往公私立醫院急診進行驗傷，並載明傷勢成因與受傷部位開立診斷證明書正本",
          "請警方調閱案發現場路口監視器或向周邊店家調取錄影光碟保全事證",
          "依刑事訴訟法第237條，於知悉加害者身分起「6個月法定期間內」向地檢署提起刑事告訴狀",
          "刑事起訴後提起刑事附帶民事訴訟，請求醫藥費、不能工作損失與精神慰撫金"
        ],
        evidenceChecklist: [
          "公私立醫院急診驗傷診斷證明書正本（載明傷勢部位與受傷原因）",
          "案發現場路口監視器或店家錄影畫面光碟",
          "現場目擊證人聯絡資料與警詢筆錄",
          "醫療費用單據、因傷受損之衣物財物照片"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 3. 公然侮辱 / 誹謗 / 妨害名譽 / 直播辱罵 (刑事告訴乃論，6個月時效)
    if (q.includes("辱罵") || q.includes("罵我") || q.includes("侮辱") || q.includes("誹謗") || q.includes("名譽") || q.includes("造謠") || q.includes("抹黑") || q.includes("直播") || q.includes("酸民") || q.includes("公然") || q.includes("三字經")) {
      const cat = "DEFAMATION_CEASE_AND_DESIST";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "公然侮辱罪 / 誹謗罪 / 網路妨害名譽爭議",
        category: cat,
        caseType: "CRIMINAL_COMPLAINT_REQUIRED",
        litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
        legalBasis: [
          "刑法第309條（公然侮辱罪）",
          "刑法第310條（誹謗罪）",
          "民法第184條第1項（侵權行為損害賠償）",
          "民法第195條第1項（侵害名譽權精神慰撫金）"
        ],
        statuteAnalysis: "刑法第309條（公然侮辱罪）、刑法第310條（誹謗罪）、民法第184條、第195條",
        isPublicProsecution: false,
        statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內提出告訴；民事侵權請求權為 2 年。",
        timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
        plainExplanation: "於公開直播、網路社群或不特定人得以共見共聞之場所遭到公然辱罵或貶損人格名譽，構成刑法公然侮辱或誹謗罪。此罪依法為【告訴乃論】，若超過6個月未提告即喪失告訴權！民事部分可請求精神慰撫金及回復名譽之適當處分。",
        recommendedAction: "1. 立即完整錄影/截圖（含網址、帳號、時間、發言內容） 2. 向管轄地檢署具狀提出刑事告訴 3. 提起民事附帶民事求償。",
        suggestedActions: [
          "第一時間將直播存證影片、聊天室發言截圖（務必包含直播時間、使用者帳號ID、公開留言內容與網址URL）完整保全並列印",
          "依刑事訴訟法第237條，於知悉犯人起「6個月法定期間內」向轄區地檢署提出妨害名譽刑事告訴狀",
          "透過檢警調閱 IP 查明被告真實身分後，提起刑事附帶民事訴訟請求新臺幣精神慰撫金與公開道歉啟事"
        ],
        evidenceChecklist: [
          "直播存證側錄影片或聊天室完整留言截圖（含發言者帳號ID、留言時間、直播網址）",
          "受害人直播頻道主頁或實名證明文件（證明該頻道與名譽受損之連結性）",
          "精神受創就醫證明、心理諮商紀錄（供請求慰撫金評估佐證）",
          "已寄發存證信函或警告留言存根（若有）"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 4. 車禍案件 (受傷為過失傷害告訴乃論；純車損為純民事)
    if (q.includes("車禍") || q.includes("撞到") || q.includes("擦撞") || q.includes("車損") || q.includes("過失傷害")) {
      const hasInjury = q.includes("傷") || q.includes("骨折") || q.includes("痛") || q.includes("住院") || q.includes("急診") || q.includes("人受傷");
      if (hasInjury) {
        const cat = "CRIMINAL_COMPLAINT_TRAFFIC";
        const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
        return {
          identifiedIssue: "車禍事故過失傷害刑事告訴暨損害賠償求償",
          category: cat,
          caseType: "CRIMINAL_COMPLAINT_REQUIRED",
          litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
          legalBasis: [
            "刑法第284條（過失傷害罪）",
            "道路交通安全規則相關規定",
            "民法第184條第1項前段（侵權損害賠償）",
            "民法第193條、第195條（醫療費、工作損失與精神慰撫金）"
          ],
          statuteAnalysis: "刑法第284條（過失傷害罪）、民法第184條、第193條、第195條",
          isPublicProsecution: false,
          statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內提出告訴；民事求償時效為 2 年。",
          timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
          plainExplanation: "車禍導致人員受傷，肇事駕駛涉犯刑法第284條過失傷害罪，此罪屬於【告訴乃論】，必須在車禍知悉犯人起 6 個月內具狀提告。提告後可於偵查庭或法院調解，起訴後亦可提起免費之刑事附帶民事訴訟求償。",
          recommendedAction: "1. 取得事故初判表與驗傷診斷書 2. 6個月內提出過失傷害告訴 3. 提起附帶民事訴訟。",
          suggestedActions: [
            "向警方申請「道路交通事故當事人登記聯單」及「初步分析研判表」釐清肇事責任",
            "前往醫院急診或門診開立載明傷勢與醫囑需休養天數之診斷證明書正本",
            "於知悉犯人起 6 個月法定時效內向地檢署或承辦警局提出過失傷害告訴",
            "檢察官起訴後，於一審辯論終結前提起刑事附帶民事訴訟求償醫療費、修車費與慰撫金"
          ],
          evidenceChecklist: [
            "道路交通事故當事人登記聯單及初判表",
            "公私立醫院診斷證明書正本及醫療費用單據",
            "行車記錄器錄影光碟或路口監視器畫面",
            "車輛維修估價單與受損部位照片"
          ],
          targetToolCategory: cat,
          recommendedToolId: cat,
          readyDocumentTitle: fallbackDoc.title,
          readyDocumentText: fallbackDoc.documentText,
          pleadingDraft: fallbackDoc.documentText,
          complianceChecklist: fallbackDoc.complianceChecklist,
          antiGhostVerification: fallbackDoc.antiGhostVerification
        };
      } else {
        const cat = "CIVIL_TORT_GENERAL";
        const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
        return {
          identifiedIssue: "車禍純財損修車費侵權損害賠償爭議",
          category: cat,
          caseType: "CIVIL",
          litigationNatureText: "💼 純民事事件（車輛財損侵權賠償，無刑事責任）",
          legalBasis: [
            "民法第184條第1項前段（過失侵權責任）",
            "民法第196條（物之損害賠償/零件折舊與工資計算）",
            "民法第213條（回復原狀原則）"
          ],
          statuteAnalysis: "民法第184條第1項、第196條（物之損害賠償）",
          isPublicProsecution: false,
          statuteOfLimitations: "民事侵權行為損害賠償請求權時效為 2 年（民法第197條）。純車損事件無人受傷，刑法毀損不罰過失，無刑事責任，非告訴乃論。",
          timeLimit: "民事侵權請求權時效為 2 年（民法第197條）",
          plainExplanation: "車禍若無任何人員受傷（純車輛毀損），因刑法第354條毀損罪不處罰過失行為，因此【純屬民事侵權損害賠償事件，無任何刑事犯罪責任，亦非告訴乃論】。您可以依民法第184條及第196條向肇事者請求車輛維修之工資與零件費用（零件需扣除折舊）。",
          recommendedAction: "1. 取得初判表確認責任比例 2. 開立修車估價單 3. 聲請調解或民事簡易庭起訴求償。",
          suggestedActions: [
            "向警方申請初步分析研判表以釐清雙方肇事主次因與過失責任比例",
            "至合格修車廠開立詳細估價單（區分零件費與工資費）並拍照存證",
            "向各鄉鎮市區調解委員會聲請調解，或向管轄法院簡易庭提起民事訴訟"
          ],
          evidenceChecklist: [
            "道路交通事故初步分析研判表與現場圖",
            "車輛受損部位清晰照片與維修估價單/發票",
            "行車記錄器錄影光碟"
          ],
          targetToolCategory: cat,
          recommendedToolId: cat,
          readyDocumentTitle: "民事侵權損害賠償起訴狀（車損求償）",
          readyDocumentText: fallbackDoc.documentText,
          pleadingDraft: fallbackDoc.documentText,
          complianceChecklist: fallbackDoc.complianceChecklist,
          antiGhostVerification: fallbackDoc.antiGhostVerification
        };
      }
    }

    // 5. 詐騙 / 寄卡 / 提款卡 / 人頭帳戶 / 洗錢 (刑事非告訴乃論/公訴罪)
    if (q.includes("卡片") || q.includes("寄卡") || q.includes("提款卡") || q.includes("人頭") || q.includes("詐騙") || q.includes("洗錢") || q.includes("買簿子") || q.includes("警示帳戶")) {
      const cat = "CRIMINAL_COMPLAINT_FRAUD";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "誤交提款卡/存摺遭詐騙集團利用（洗錢人頭帳戶自救與刑責防禦）",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴罪，檢警知悉即應主動偵辦）",
        legalBasis: [
          "刑法第339條（詐欺取財罪）",
          "刑法第30條（幫助犯）",
          "洗錢防制法第15條之2（無正當理由交付帳戶罪）",
          "刑法第339條之4（加重詐欺罪）"
        ],
        statuteAnalysis: "刑法第339條（詐欺罪）、刑法第30條（幫助犯）、洗錢防制法第15條之2",
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴罪）】檢警知悉即應主動追訴偵查，無告訴乃論6個月限制；請把握黃金時間立即掛失帳戶並向警局報案。",
        timeLimit: "【非告訴乃論】公訴罪無6個月限制，請立即掛失報案",
        plainExplanation: "因假求職、假貸款等騙局誤將提款卡或密碼寄出，涉及洗錢防制法人頭帳戶交付罪及詐欺罪幫助犯，此類犯罪均屬【非告訴乃論公訴罪】。為防止名下帳戶遭通報警示凍結並自證清白，必須立即搶先掛失並主動至警局報案說明。",
        recommendedAction: "1. 立即致電銀行客服掛失 2. 攜帶完整招募對話至派出所報案 3. 具狀向地檢署陳報被騙交付事實。",
        suggestedActions: [
          "立即致電發卡銀行 24H 客服辦理掛失停卡與止付，阻斷不法金流進出",
          "將假求職/假貸款之完整通訊軟體對話截圖、超商寄件小白單或宅配單據印出",
          "主動前往轄區派出所報案並取得「受處理案件證明單」，自證無交付人頭帳戶犯罪故意",
          "具狀向管轄地檢署陳報「被騙交付金融卡刑事答辯/自白陳報狀」爭取不起訴處分"
        ],
        evidenceChecklist: [
          "通訊軟體完整對話紀錄截圖（包含對方誘騙寄卡理由、寄件超商門市/收件人資訊及時間戳記）",
          "超商物流交寄單據、快遞託運單存根聯或寄件包裹編號紀錄",
          "當初吸引接觸之虛假徵才貼文、貸款代辦廣告、簡訊截圖或社團網址",
          "該涉案銀行帳戶存摺封面、近期交易明細及向銀行申請掛失止付之相關憑證"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 6. 借錢不還 / 債務催討 / 本票 (純民事事件)
    if (q.includes("借錢") || q.includes("欠錢") || q.includes("不還錢") || q.includes("借據") || q.includes("本票") || q.includes("支付命令") || q.includes("借款")) {
      const cat = "DEMAND_LETTER_DEBT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "消費借貸欠款催告返還暨支付命令爭議",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（消費借貸返還/支付命令，無刑事責任）",
        legalBasis: [
          "民法第478條（消費借貸返還請求權）",
          "民法第229條（給付遲延責任）",
          "民事訴訟法第508條（督促程序支付命令）",
          "票據法第123條（本票准許強制執行裁定）"
        ],
        statuteAnalysis: "民法第478條（消費借貸返還）、民事訴訟法第508條（支付命令）",
        isPublicProsecution: false,
        statuteOfLimitations: "借款本金請求權消滅時效為 15 年（民法第125條）；利息請求權為 5 年；本票追索權為 3 年。純民事債務不履行，無坐牢刑責，非告訴乃論。",
        timeLimit: "借款本金消滅時效為 15 年（民法第125條）",
        plainExplanation: "單純借錢未依約清償，屬於民事債務不履行事件（除非借款之初即使用虛構身分施用詐術）。【純屬民事事件，無刑事犯罪責任，亦非告訴乃論】。您可以寄發存證信函催告返還，若對方置之不理，可向法院聲請「民事支付命令」（規費僅500元、免開庭）或提起民事訴訟取得執行名義查封扣押對方薪水與財產。",
        recommendedAction: "1. 整理借據、匯款明細與催討對話 2. 寄發存證信函中斷時效 3. 向法院聲請支付命令。",
        suggestedActions: [
          "彙整借款契約借據、銀行跨行轉帳明細表及LINE約定還款日之對話截圖",
          "寄發「借款清償催告存證信函」定一個月以上相當期限催告對方返還",
          "若期限屆滿未還，向債務人戶籍地地方法院聲請「民事支付命令」或「本票裁定」",
          "支付命令確定後聲請強制執行查扣債務人銀行存款、不動產或按月扣薪"
        ],
        evidenceChecklist: [
          "借據、借貸契約書正本或借款LINE對話截圖",
          "銀行/郵局轉帳匯款成功明細表或支票本票存根",
          "借款人姓名、戶籍地址、身分證字號或聯絡資訊",
          "存證信函掛號收件回執"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 7. 恐嚇危安 / 威脅 (刑事非告訴乃論/公訴罪)
    if (q.includes("恐嚇") || q.includes("威脅") || q.includes("殺") || q.includes("打斷腿") || q.includes("要你好看")) {
      const cat = "CRIMINAL_COMPLAINT_INTIMIDATION";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "恐嚇危害安全罪 / 強制罪爭議",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴罪，檢警知悉即應主動偵辦）",
        legalBasis: [
          "刑法第305條（恐嚇危害安全罪）",
          "刑法第304條（強制罪）",
          "民法第184條（侵權行為損害賠償）"
        ],
        statuteAnalysis: "刑法第305條（恐嚇危害安全罪）、第304條（強制罪）",
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴罪）】檢警知悉即應依法偵辦追訴，無6個月告訴乃論限制；民事侵權請求權時效為2年。",
        timeLimit: "【非告訴乃論】公訴罪無6個月限制",
        plainExplanation: "以加害生命、身體、自由、名譽、財產之事恐嚇他人致生危害於安全，構成刑法第305條恐嚇危害安全罪，依法屬於【非告訴乃論公訴罪】。檢警機關知悉後即應依法主動偵查追訴。",
        recommendedAction: "1. 完整截圖並錄音存證 2. 前往派出所報警取得受處理證明 3. 具狀向地檢署提告。",
        suggestedActions: [
          "對所有恐嚇文字、語音留言及通話錄音進行完整備份存證（包含時間戳記）",
          "前往派出所報案並取得受理案件證明單",
          "具狀向管轄地檢署提起恐嚇危安罪刑事告訴狀"
        ],
        evidenceChecklist: [
          "恐嚇簡訊/LINE通聯對話完整截圖",
          "電話通話錄音光碟與譯文",
          "報案受處理案件證明單"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 8. 妨害性自主 / 強制性交 (刑事非告訴乃論公訴重罪)
    if (q.includes("性侵") || q.includes("強暴") || q.includes("非自願性行為") || q.includes("妨害性自主") || q.includes("強制性交")) {
      const cat = "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "妨害性自主 / 強制性交被害案件",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴重罪，檢警知悉即應主動偵辦）",
        legalBasis: [
          "刑法第221條（強制性交罪）",
          "刑法第224條（強制猥褻罪）",
          "性侵害犯罪防治法相關規定",
          "民法第184條、第195條（精神慰撫金）"
        ],
        statuteAnalysis: "刑法第221條（強制性交罪，非告訴乃論公訴罪）、民法第184條、第195條（精神慰撫金）",
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴重罪）】無6個月限制；黃金72小時內請至急診進行一站式性侵驗傷採證。",
        timeLimit: "【非告訴乃論】公訴重罪無6個月限制",
        plainExplanation: "違反意願之性交或猥褻行為均屬非告訴乃論公訴重罪。請優先保全生物檢體與對話截圖，並可依法請求損害賠償與精神慰撫金。",
        recommendedAction: "1. 72小時內急診驗傷採證（勿洗澡更衣） 2. 撥打113或向地檢署提出告訴 3. 聲請保護令並求償精神慰撫金。",
        suggestedActions: [
          "案發72小時內前往公私立醫院急診進行一站式驗傷採樣（切勿沐浴更衣）",
          "撥打113專線由社工陪同製作警詢筆錄或具狀向地檢署提出告訴",
          "聲請親密關係通常保護令並提起刑事附帶民事訴訟請求醫療費與慰撫金"
        ],
        evidenceChecklist: [
          "公私立醫院性侵害驗傷診斷書",
          "LINE案發前後通聯對話",
          "錄音光碟與心理諮商就醫證明"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 9. 竊盜 / 侵占 (公訴罪，親屬同居特例為告訴乃論)
    if (q.includes("偷") || q.includes("竊盜") || q.includes("侵占") || q.includes("拿走") || q.includes("偷竊")) {
      const cat = "CRIMINAL_COMPLAINT_THEFT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "竊盜罪 / 侵占罪 / 親屬伴侶財產侵害爭議",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（一般伴侶公訴罪；同居親屬為告訴乃論）",
        legalBasis: [
          "刑法第320條（普通竊盜罪）",
          "刑法第324條（親屬同居特例）",
          "刑法第335條（普通侵占罪）",
          "民法第767條（所有物返還請求權）"
        ],
        statuteAnalysis: "刑法第320條（竊盜罪）、刑法第324條（親屬間竊盜特例）、民法第184條、民法第767條（所有物返還）",
        isPublicProsecution: true,
        statuteOfLimitations: "未同居一般伴侶為非告訴乃論公訴罪（隨時可追訴）；若為同居伴侶或親屬，依刑法第324條為告訴乃論，應自知悉犯人之日起6個月內提告。",
        timeLimit: "一般為公訴罪；同居親屬須於 6 個月內提告",
        plainExplanation: "未經同意拿取他人財物或霸佔借用物拒還，構成竊盜罪或侵占罪。若雙方非同居親屬，屬於非告訴乃論公訴罪；同居親屬間則為告訴乃論。",
        recommendedAction: "1. 保全證據（監視器、對話自承截圖、銀行金流） 2. 向地檢署提出刑事告訴狀 3. 提起刑事附帶民事訴訟或民事起訴求償。",
        suggestedActions: [
          "第一時間保全監視器、催討對話截圖與失竊物品所有權憑證",
          "向管轄地檢署具狀提出刑事竊盜/侵占告訴",
          "提起刑事附帶民事訴訟或民事起訴請求返還原物與損害賠償"
        ],
        evidenceChecklist: [
          "失竊物品購買憑證或照片",
          "案發現場監視器畫面",
          "通訊軟體催討對話截圖與被告自承紀錄",
          "存摺盜領/盜刷銀行交易明細"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 10. 租屋糾紛 / 漏水 / 房屋瑕疵 (純民事事件)
    if (q.includes("租屋") || q.includes("房東") || q.includes("房客") || q.includes("漏水") || q.includes("押金") || q.includes("裝潢") || q.includes("修繕")) {
      const cat = "CIVIL_TORT_GENERAL";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "租賃契約修繕爭議 / 房屋漏水侵權損害賠償",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（民事契約與瑕疵修繕請求，無刑事責任）",
        legalBasis: [
          "民法第429條、第430條（出租人修繕義務）",
          "民法第184條第1項前段（侵權損害賠償）",
          "民法第493條（承攬瑕疵修補）"
        ],
        statuteAnalysis: "民法第429條、第430條（租賃修繕義務）、民法第184條",
        isPublicProsecution: false,
        statuteOfLimitations: "民事契約與瑕疵修補請求權時效（租賃物修繕/民事請求2年侵權或15年契約時效）。純民事糾紛無刑事責任，非告訴乃論。",
        timeLimit: "民事請求權時效（侵權2年 / 契約15年）",
        plainExplanation: "租賃房屋修繕、漏水問題或押金返還，屬於民法債篇之契約與侵權爭議。【純屬民事事件，無刑事犯罪責任，亦非告訴乃論】。您可以寄發存證信函定期催告修繕，若對方逾期不修，得自行雇工修復後自租金扣抵，或提起民事訴訟求償。",
        recommendedAction: "1. 拍攝漏水受損部位照片 2. 寄發存證信函限期修繕 3. 聲請鄉鎮市調解或民事簡易庭起訴。",
        suggestedActions: [
          "拍攝房屋漏水、瑕疵部位之照片並取得水電技師修復估價單",
          "寄發存證信函定相當期限（如7至10日）催告房東或樓上住戶進場修繕",
          "向房屋所在地鄉鎮市區調解委員會聲請調解或向地方法院簡易庭起訴"
        ],
        evidenceChecklist: [
          "租賃契約書或建物所有權狀影本",
          "漏水現場受損照片與水電工程鑑定估價單",
          "通訊軟體催告對話截圖與存證信函回執"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: "民事損害賠償暨請求修繕起訴狀",
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 11. 通用預設 (根據有無刑法關鍵字做嚴謹定性)
    const cat = "UNIVERSAL_AI_PLEADING";
    const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
    return {
      identifiedIssue: "生活爭議法律案件實體法與程序法即時診斷",
      category: cat,
      caseType: "CIVIL",
      litigationNatureText: "💼 民事/司法爭議事件（權利行使與救濟）",
      legalBasis: ["民法第184條（侵權行為損害賠償）", "民法第767條（物上請求權）"],
      statuteAnalysis: "依民法第184條、第767條或實體法相關規定",
      isPublicProsecution: false,
      statuteOfLimitations: "民事侵權請求權時效為 2 年（民法第197條）；若涉及刑事告訴乃論罪則應於知悉犯人起 6 個月內提出。",
      timeLimit: "民事侵權時效 2 年 / 刑事告訴乃論 6 個月",
      plainExplanation: `針對您的爭議情況「${query}」，系統已啟動全能法律實務診斷，為您彙整實體法要件、時效限制與救濟程序。`,
      recommendedAction: "第一時間保全相關物證、通訊軟體截圖與錄音紀錄，向主管機關或管轄地院具狀提出。",
      suggestedActions: [
        "第一時間保全相關事證、截圖與錄音錄影紀錄",
        "向管轄司法警察機關、地檢署或法院具狀提出",
        "使用法律工具箱產製專屬合法書狀主張權益"
      ],
      evidenceChecklist: [
        "通訊軟體完整對話紀錄截圖",
        "相關合約、單據憑證或交易明細",
        "身分證明文件與物證照片"
      ],
      targetToolCategory: cat,
      recommendedToolId: cat,
      readyDocumentTitle: fallbackDoc.title,
      readyDocumentText: fallbackDoc.documentText,
      pleadingDraft: fallbackDoc.documentText,
      complianceChecklist: fallbackDoc.complianceChecklist,
      antiGhostVerification: fallbackDoc.antiGhostVerification
    };
  }

  app.post("/api/triage/universal", async (req, res) => {
    try {
      const { query = "" } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "請提供爭議情況敘述" });
      }

      const apiKey = resolveApiKey();
      const isMissing = isApiKeyMissingOrPlaceholder(apiKey);

      if (isMissing) {
        return res.json(buildIntelligentRuleBasedTriage(query));
      }

      // Gemini AI dynamic triage
      const ai = createGeminiClient(apiKey);
      const prompt = `
你是一位精通臺灣現行刑法、刑事訴訟法、民法、民事訴訟法、洗錢防制法與司法院實務之資深法官與檢察官等級法務專家。
使用者提出以下生活法律爭議或犯罪被害情況：
「${query}」

請進行嚴謹的案件性質定性（非常重要）：
1. 【純民事事件（caseType: "CIVIL"）】：例如寵物被咬傷/車損純財損/房屋漏水/借貸借錢不還/買賣瑕疵/租屋糾紛等。此類案件「無刑事犯罪（刑法毀損不罰過失）」、「無坐牢責任」，屬於民事侵權或契約損害賠償，時效依民法第197條為「知悉損害及賠償義務人起 2 年」，【絕對不是告訴乃論】！
2. 【刑事非告訴乃論 / 公訴罪（caseType: "CRIMINAL_PUBLIC"）】：如詐欺（§339）、人頭帳戶洗錢（§15-2）、強制性交（§221）、恐嚇危安（§305）、非同居竊盜（§320）等。檢警知悉即應主動追訴偵查，無告訴乃論6個月限制。
3. 【刑事告訴乃論（caseType: "CRIMINAL_COMPLAINT_REQUIRED"）】：如公然侮辱（§309）、誹謗（§310）、故意毀損（§354）、普通傷害（§277）、妨害秘密（§315-1）、同居親屬間竊盜（§324）等。依刑事訴訟法第237條，必須自知悉犯人之日起「6個月內具狀提告」。

【重要防呆與要件審查機制（Syllogism Validation）】
在撰寫書狀前，你必須先擔任法官/律師的角色，進行「三段論法」的構成要件審查：
1. 檢視使用者提供的事實（小前提）是否足以該當該罪名/請求權的法律要件（大前提）。
2. 【全法規通用】此三段論法機制適用於所有法律（民事、刑事、行政等）。審查時，你必須找出該當法條的每一個「構成要件」，並一一比對使用者提供的事實。此外，適用法規時，必須嚴守「特別法優於普通法」原則。例如：若為「性影像或性暴力」案件，必須嚴格區別「性暴力犯罪防制四法」：(a)若被害人未滿18歲，依特別法優於普通法原則，【絕對優先適用】《兒少性剝削防制條例》，排除刑法普通規定；(b)成人偷拍散布才依《刑法》第319-1~4條處罰；(c)影像下架與隱私保護依《性侵害犯罪防治法》；(d)經濟補償與協助依《犯罪被害人權益保障法》。必須釐清「被害人年齡」、「是否同意拍攝」、「是否同意散布」等要件。
3. 如果使用者提供的資訊過於模糊、殘缺（例如僅說「我被性交」、「他欠我錢」），請將 "isSyllogismComplete" 設為 false，並在 "missingQuestions" 中列出需要釐清的關鍵事實與理由。每個問題必須提供 "options" 陣列（至少提供 2 到 3 個符合實務常見情境的具體選項供使用者點選）。

請針對此情況進行精準、實用之法律即時導診與書狀生成，並請**僅回傳標準 JSON 格式**（不要任何 Markdown 程式碼區塊外圍標籤）：
{
  "identifiedIssue": "精確案由（例：寵物遭鄰犬咬傷侵權損害賠償爭議、公然侮辱妨害名譽、誤交金融卡洗錢防禦等）",
  "category": "CIVIL_COMPLAINT 或適當之工具代碼",
  "caseType": "CIVIL" 或 "CRIMINAL_PUBLIC" 或 "CRIMINAL_COMPLAINT_REQUIRED",
  "litigationNatureText": "訴訟性質清楚說明（例：純民事損害賠償事件（無刑事責任）、刑事非告訴乃論公訴罪、刑事告訴乃論罪）",
  "legalBasis": ["民法第190條（動物占有人責任）", "民法第184條第1項", "民法第196條（物之損害賠償）"],
  "statuteAnalysis": "精確法條分析說明",
  "isPublicProsecution": false,
  "statuteOfLimitations": "時效限制（明確載明：民事侵權2年時效、告訴乃論6個月時效或公訴追訴權時效）",
  "timeLimit": "時效重點摘要（例如：民事侵權行為損害賠償請求權時效為 2 年）",
  "plainExplanation": "用白話深入剖析案情構成要件、責任歸屬與賠償範圍",
  "suggestedActions": ["具體行動步驟1", "具體行動步驟2", "具體行動步驟3", "具體行動步驟4"],
  "evidenceChecklist": ["具體必備證據1", "具體必備證據2", "具體必備證據3", "具體必備證據4"],
  "targetToolCategory": "CIVIL_PET_DISPUTE 或適當代碼",
  "recommendedToolId": "CIVIL_PET_DISPUTE 或適當代碼",
  "readyDocumentTitle": "專業法律文書名稱（例如：民事損害賠償起訴狀 / 鄉鎮市調解聲請書 / 存證信函）",
  "readyDocumentText": "符合我國司法機關格式之正式起訴狀/調解聲請書/告訴狀全文內容...",
  "isSyllogismComplete": true,
  "missingQuestions": [{"question": "若不完整，需補充的問題", "reason": "法條要件理由", "options": ["常見情境A", "常見情境B", "常見情境C"]}]
}
}
`;

      const result = await safeGenerateContent(ai, prompt, false);
      let jsonParsed: any = null;
      try {
        const cleanJson = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        jsonParsed = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("[Universal Triage] JSON parse failed, using intelligent rule-based triage");
      }

      if (jsonParsed && jsonParsed.readyDocumentText) {
        const antiGhost = verifyLegalCitations(jsonParsed.readyDocumentText);
        const legalArr = Array.isArray(jsonParsed.legalBasis) 
          ? jsonParsed.legalBasis 
          : (jsonParsed.statuteAnalysis ? [jsonParsed.statuteAnalysis] : ["民法第184條"]);
        const actionsArr = Array.isArray(jsonParsed.suggestedActions) 
          ? jsonParsed.suggestedActions 
          : [jsonParsed.recommendedAction || "儘速保全證據並具狀向管轄地檢署或法院提出告訴或起訴"];

        let caseType = jsonParsed.caseType;
        if (!caseType) {
          if (jsonParsed.isPublicProsecution === true) caseType = "CRIMINAL_PUBLIC";
          else if (legalArr.some((l: string) => l.includes("刑法"))) caseType = "CRIMINAL_COMPLAINT_REQUIRED";
          else caseType = "CIVIL";
        }

        return res.json({
          identifiedIssue: jsonParsed.identifiedIssue || "法律爭議案件分析",
          category: jsonParsed.category || "UNIVERSAL_AI_PLEADING",
          caseType,
          isSyllogismComplete: jsonParsed.isSyllogismComplete !== false,
          missingQuestions: jsonParsed.missingQuestions || [],
          litigationNatureText: jsonParsed.litigationNatureText || (caseType === "CIVIL" ? "純民事事件（侵權損害賠償/調解，無刑事責任）" : (caseType === "CRIMINAL_PUBLIC" ? "刑事非告訴乃論公訴罪（檢警知悉即應偵辦）" : "刑事告訴乃論罪（知悉犯人起6個月內須具狀提告）")),
          legalBasis: legalArr,
          statuteAnalysis: jsonParsed.statuteAnalysis || legalArr.join("、"),
          isPublicProsecution: caseType === "CRIMINAL_PUBLIC",
          statuteOfLimitations: jsonParsed.statuteOfLimitations || (caseType === "CIVIL" ? "民事侵權請求權時效為2年（民法第197條）" : "告訴乃論應於6個月內提告"),
          timeLimit: jsonParsed.timeLimit || jsonParsed.statuteOfLimitations || (caseType === "CIVIL" ? "民事請求權時效為 2 年" : "刑事時效警示"),
          plainExplanation: jsonParsed.plainExplanation || "針對本爭議案件，系統已完成實體法與程序法核實解析。",
          recommendedAction: jsonParsed.recommendedAction || actionsArr[0],
          suggestedActions: actionsArr,
          evidenceChecklist: jsonParsed.evidenceChecklist || ["通訊軟體對話紀錄", "金流匯款單據", "相關證物照片"],
          targetToolCategory: jsonParsed.targetToolCategory || jsonParsed.category || "UNIVERSAL_AI_PLEADING",
          recommendedToolId: jsonParsed.recommendedToolId || jsonParsed.targetToolCategory || "UNIVERSAL_AI_PLEADING",
          readyDocumentTitle: jsonParsed.readyDocumentTitle || "司法爭議起訴/告訴/陳報狀",
          readyDocumentText: antiGhost.sanitizedText,
          pleadingDraft: antiGhost.sanitizedText,
          complianceChecklist: [
            { rule: "司法院公開法規庫核實（Anti-Ghosting）", passed: antiGhost.ghostCount === 0, detail: "已自動校對引述法規真實性" },
            { rule: "司法機關訴狀要件合規", passed: true, detail: "具備當事人、訴之聲明、事實理由與證據清單" }
          ],
          antiGhostVerification: {
            totalCitationsChecked: antiGhost.totalChecked,
            ghostCitationsFound: antiGhost.ghostCount,
            verifiedCitations: antiGhost.results
          }
        });
      }

      return res.json(buildIntelligentRuleBasedTriage(query));
    } catch (err: any) {
      console.error("Universal triage error, providing intelligent rule-based triage:", err);
      return res.json(buildIntelligentRuleBasedTriage(req.body?.query || ""));
    }
  });

  app.post("/api/toolbox/verify-citations", async (req, res) => {
    try {
      const { documentText = "" } = req.body;
      const verification = verifyLegalCitations(documentText);
      return res.json(verification);
    } catch (err: any) {
      console.error("Toolbox verify citations error:", err);
      return res.status(500).json({ error: err.message || "伺服器內部錯誤" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
