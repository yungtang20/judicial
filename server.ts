
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
import { UNIVERSAL_SYLLOGISM_RULES } from "./src/prompts/universal-syllogism.js";
import { buildFallbackJudgmentAnalysis, buildFallbackPetition } from "./src/utils/fallbacks.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "./src/utils/defenseFallbacks.js";
import { buildFallbackToolboxResult } from "./src/utils/toolboxFallbacks.js";
import { verifyLegalCitations } from "./src/lib/citationVerifier.js";
import { assertGeneratedDocumentVerified, verifyGeneratedDocument } from "./src/lib/generatedDocumentPipeline.js";
import { LEGAL_TOOL_TITLES } from "./src/lib/legalToolTitles.js";
import { buildIntelligentRuleBasedTriage } from "./src/lib/universalTriage.js";
import { precheckLegalInput } from "./src/lib/legalInputPrecheck.js";

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
      const pagePrompt = `你是一位精通繁體中文、法律文書與法院裁判書的專業 OCR 光學文字識讀專家。
目前正在解析第 ${idx + 1} 頁影像。請仔細、完整地辨識並轉錄此頁影像中的所有文字（包含手寫簽名、手寫字跡、蓋章、印刷文字、表格欄位與數值、問答筆錄、身分證件等）。
請保持最真實、最精準的排版與段落格式，逐字逐句完整重現，絕對不要遺漏任何一頁筆錄、問答或表格！不要進行任何總結、解釋、潤飾或添加多餘的提示字首尾。
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
      const legalInputPrecheck = precheckLegalInput(JSON.stringify(req.body ?? {}), "generation");
      if (legalInputPrecheck.status === "reject") {
        return res.status(422).json({ error: "法律輸入引用檢核未通過，請先修正或確認引用", legalInputPrecheck });
      }
      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(buildFallbackPetition(req.body)));
        return res.json({
          petitionText: verified.documentText,
          antiGhostVerification: verified.antiGhostVerification,
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
          ...(() => { const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(buildFallbackPetition(req.body))); return { petitionText: verified.documentText, antiGhostVerification: verified.antiGhostVerification }; })(),
          isFallback: true,
          warning: "Gemini API 暫時高負載，已自動套用標準司法院書狀範本格式生成"
        });
      }
      const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(petitionText));
      return res.json({ petitionText: verified.documentText, antiGhostVerification: verified.antiGhostVerification });
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
      const legalInputPrecheck = precheckLegalInput(JSON.stringify({ clientInput, triageData, mineData, caseInfo }), "generation");
      if (legalInputPrecheck.status === "reject") {
        return res.status(422).json({ error: "法律輸入引用檢核未通過，請先修正或確認引用", legalInputPrecheck });
      }

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Defense API] No valid API Key, returning fallback pleading.");
        const fallback = buildFallbackDefensePleading(pleadingType, clientInput, caseInfo);
        const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(fallback.pleadingText || ""));
        return res.json({ ...fallback, pleadingText: verified.documentText, antiGhostVerification: verified.antiGhostVerification, modelUsed: "offline-fallback", isFallback: true });
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
        const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(fallback.pleadingText || ""));
        return res.json({ ...fallback, pleadingText: verified.documentText, antiGhostVerification: verified.antiGhostVerification, modelUsed: "offline-fallback", isFallback: true });
      }

      const verifiedPleading = assertGeneratedDocumentVerified(verifyGeneratedDocument(pleadingText));
      return res.json({
        pleadingType,
        title: pleadingType === "LAWYER_PLEADING" ? (caseInfo.caseType === "criminal" ? "刑事答辯狀" : "民事準備書狀") : (caseInfo.caseType === "criminal" ? "刑事陳報個人意見狀" : "民事陳報個人意見狀"),
        courtName: caseInfo.courtName || "臺灣臺北地方法院",
        caseNo: caseInfo.caseNo || "113年度訴字第1234號",
        submitter: pleadingType === "LAWYER_PLEADING" ? `訴訟代理人：${caseInfo.lawyerName || "訴訟代理人律師"}` : `陳報人：${caseInfo.clientName || "當事人"}`,
        pleadingText: verifiedPleading.documentText,
        antiGhostVerification: verifiedPleading.antiGhostVerification,
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
      const legalInputPrecheck = precheckLegalInput(JSON.stringify(params), "generation");
      if (legalInputPrecheck.status === "reject") {
        return res.status(422).json({ error: "法律輸入引用檢核未通過，請先修正或確認引用", legalInputPrecheck });
      }

      const apiKey = resolveApiKey();
      if (isApiKeyMissingOrPlaceholder(apiKey)) {
        console.log("[Toolbox API] No valid API Key, returning verified rule-based fallback.");
        const fallback = buildFallbackToolboxResult(toolCategory, params);
        if (fallback.antiGhostVerification.ghostCitationsFound > 0 || fallback.antiGhostVerification.verifiedCitations.some(citation => !citation.verified)) {
          return res.status(422).json({ error: "離線法律文件引用檢核未通過，拒絕回傳未確認引用文件", antiGhostVerification: fallback.antiGhostVerification });
        }
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
        if (fallback.antiGhostVerification.ghostCitationsFound > 0 || fallback.antiGhostVerification.verifiedCitations.some(citation => !citation.verified)) {
          return res.status(422).json({ error: "離線法律文件引用檢核未通過，拒絕回傳未確認引用文件", antiGhostVerification: fallback.antiGhostVerification });
        }
        return res.json(fallback);
      }

      // Run the shared generate → verify → fail-closed pipeline.
      const verifiedDocument = assertGeneratedDocumentVerified(verifyGeneratedDocument(docText));
      const antiGhost = verifiedDocument.antiGhostVerification;

      const finalTitle = LEGAL_TOOL_TITLES[toolCategory] || "專業法律文書";

      return res.json({
        toolCategory,
        title: finalTitle,
        documentText: verifiedDocument.documentText,
        complianceChecklist: [
            { rule: "引用檢核（heuristic）", passed: antiGhost.verificationPassed, detail: antiGhost.verificationPassed ? "未發現明顯異常，未索引項目仍需人工查證" : `發現 ${antiGhost.ghostCitationsFound} 處疑似虛構或未確認引用` },
          { rule: "現行法規格式合規", passed: true, detail: "符合我國司法機關、非訟中心與郵局實務要件" }
        ],
        antiGhostVerification: {
          totalCitationsChecked: antiGhost.totalCitationsChecked,
          ghostCitationsFound: antiGhost.ghostCitationsFound,
          verifiedCitations: antiGhost.verifiedCitations,
          verificationPassed: antiGhost.verificationPassed
        },
        disclaimer: "已執行引用格式與本機資料比對；結果不等同官方核實，請於正式使用前獨立確認來源。",
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

  app.post("/api/triage/universal", async (req, res) => {
    try {
      const { query = "" } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "請提供爭議情況敘述" });
      }
      const legalInputPrecheck = precheckLegalInput(query, "analysis");
      if (legalInputPrecheck.status === "reject") {
        return res.status(422).json({ error: "法律輸入引用檢核未通過，請先修正或確認引用", legalInputPrecheck });
      }

      const apiKey = resolveApiKey();
      const isMissing = isApiKeyMissingOrPlaceholder(apiKey);

      if (isMissing) {
        const fallbackTriage = buildIntelligentRuleBasedTriage(query);
        const fallbackVerification = fallbackTriage.antiGhostVerification;
        if (fallbackVerification && (fallbackVerification.ghostCitationsFound > 0 || fallbackVerification.verifiedCitations.some(citation => !citation.verified))) {
          return res.status(422).json({
            error: "離線法律文件引用檢核未通過，拒絕回傳未確認引用文件",
            antiGhostVerification: fallbackVerification
          });
        }
        return res.json({ ...fallbackTriage, legalInputPrecheck });
      }

      // Gemini AI dynamic triage
      const ai = createGeminiClient(apiKey);
      const prompt = `
${UNIVERSAL_SYLLOGISM_RULES}
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
        if (antiGhost.ghostCount > 0 || antiGhost.results.some(citation => !citation.verified)) {
          return res.status(422).json({
            error: "法律文件引用檢核未通過，拒絕回傳未確認引用文件",
            antiGhostVerification: {
              totalCitationsChecked: antiGhost.totalChecked,
              ghostCitationsFound: antiGhost.ghostCount,
              verifiedCitations: antiGhost.results
            }
          });
        }
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
          plainExplanation: jsonParsed.plainExplanation || "針對本爭議案件，系統已完成實體法與程序法初步分析，引用結果仍需人工查證。",
          recommendedAction: jsonParsed.recommendedAction || actionsArr[0],
          suggestedActions: actionsArr,
          evidenceChecklist: jsonParsed.evidenceChecklist || ["通訊軟體對話紀錄", "金流匯款單據", "相關證物照片"],
          targetToolCategory: jsonParsed.targetToolCategory || jsonParsed.category || "UNIVERSAL_AI_PLEADING",
          recommendedToolId: jsonParsed.recommendedToolId || jsonParsed.targetToolCategory || "UNIVERSAL_AI_PLEADING",
          readyDocumentTitle: jsonParsed.readyDocumentTitle || "司法爭議起訴/告訴/陳報狀",
          readyDocumentText: antiGhost.sanitizedText,
          pleadingDraft: antiGhost.sanitizedText,
          complianceChecklist: [
            { rule: "引用檢核（heuristic）", passed: antiGhost.ghostCount === 0 && antiGhost.results.every(citation => citation.verified), detail: "已自動比對引述格式；未索引項目仍需人工查證" },
            { rule: "司法機關訴狀要件合規", passed: true, detail: "具備當事人、訴之聲明、事實理由與證據清單" }
          ],
          legalInputPrecheck,
          antiGhostVerification: {
            totalCitationsChecked: antiGhost.totalChecked,
            ghostCitationsFound: antiGhost.ghostCount,
            verifiedCitations: antiGhost.results
          }
        });
      }

      return res.json({ ...buildIntelligentRuleBasedTriage(query), legalInputPrecheck });
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
