
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { getGenerateAppealPetitionPrompt } from "./src/prompts/generate-appeal-petition.js";
import { getAnalyzeJudgmentPrompt } from "./src/prompts/analyze-judgment.js";
import { buildFallbackJudgmentAnalysis, buildFallbackPetition, buildFallbackPoliceAnalysis } from "./src/utils/fallbacks.js";
import { buildPrecedentFallback, verifyPrecedents } from "./src/lib/precedentVerification.js";
import { normalizeJudicialResponse, resolveJudicialCredentials } from "./src/lib/judicialCredentials.js";
import { generateContentWithFallback } from "./src/lib/geminiGeneration.js";
import { parseStrictJson } from "./src/lib/strictJson.js";
import { searchTlr } from "./src/lib/tlrSearch.js";
import { normalizeTaiwanCaseQuery } from "./src/lib/caseQuery.js";
import { fetchJudicialUrl, validateJudicialUrl } from "./src/lib/judicialUrlPolicy.js";

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

// 取得候選模型陣列（依優先級排序）
function getCandidateModels(): string[] {
  return [
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
  ];
}

interface GenerateResult {
  text: string;
  modelUsed: string;
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
  const PORT = 3000;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));


app.post("/api/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    let validatedUrl: URL;
    try {
      validatedUrl = await validateJudicialUrl(url);
    } catch (urlError) {
      return res.status(400).json({
        error: "只允許讀取司法院官方 HTTPS 網址",
        code: urlError?.code || "JUDICIAL_URL_REJECTED"
      });
    }

    // If it's a Judicial website URL, try resolving via TLR (Taiwan Legal RAG) first!
    if (validatedUrl.hostname === "judicial.gov.tw" || validatedUrl.hostname.endsWith(".judicial.gov.tw")) {
      try {
        const urlObj = new URL(url);
        const idParam = urlObj.searchParams.get("id") || urlObj.searchParams.get("jrecno") || urlObj.searchParams.get("kw") || urlObj.searchParams.get("k");
        if (idParam) {
          const query = normalizeTaiwanCaseQuery(idParam);
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

    try {
      const response = await fetchJudicialUrl(fetch, url, {});
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
      if (fetchErr.name === 'AbortError') {
        throw new Error('讀取目標網站逾時 (連線無回應)。這通常是因為目標網站的主機防火牆封鎖了來自雲端伺服器的 IP。建議使用【⚖️ 判決檢索載入】搜尋案號，或直接複製貼上。');
      }
      throw fetchErr;
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch URL" });
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
        const result = await generateContentWithFallback(ai, prompt, true);
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
      let parsedData: any = {};
      try {
        parsedData = parseStrictJson(responseText);
        if (Array.isArray(parsedData)) throw new Error("Expected JSON object");
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
    
    const data = await searchTlr(fetch, query, { searchType: search_type, maxResults: Number(max_results) || 5 });
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
      const { memberAccount, pwd } = resolveJudicialCredentials(process.env);
      if (!memberAccount || !pwd) {
        return res.status(400).json({ succeeded: false, message: "請提供司法院資料開放平臺帳號與密碼，或於環境變數中設定" });
      }
      const response = await fetch("https://opendata.judicial.gov.tw/api/MemberTokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberAccount, pwd })
      });
      const data = await response.json();
      const responseError = normalizeJudicialResponse(response.status, data);
      if (responseError) {
        return res.status(responseError.statusCode).json(responseError.body);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ succeeded: false, message: "取得會員 Token 失敗：" + err.message });
    }
  });
  app.post("/api/judicial/jdg/auth", async (req, res) => {
    try {
      const { memberAccount: user, pwd: password } = resolveJudicialCredentials(process.env);
      if (!user || !password) {
        return res.status(400).json({ error: "缺少帳號或密碼", message: "缺少帳號或密碼" });
      }
      const response = await fetch("https://data.judicial.gov.tw/jdg/api/Auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      const data = await response.json();
      const responseError = normalizeJudicialResponse(response.status, data);
      if (responseError) {
        return res.status(responseError.statusCode).json(responseError.body);
      }
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
   - 若本案為【刑事案件/刑事簡易判決/強制猥褻/性自主/傷害/詐欺等】：嚴禁引用民事訴訟法或民事裁定！必須嚴格引用刑事訴訟法與已由 TLR 驗證之刑事裁判。
   - 若本案為【民事案件】：方得引用【民事訴訟法第 277 條】與【民事裁判/民事大法庭裁定】。
   - 若本案為【刑事補償案件】：引用【刑事補償法第 17 條】與司法院/法務部刑事補償函釋。
2. 務必引用臺灣實務真實存在之裁判字號、大法庭裁定或主管機關函釋。嚴禁自行虛構編造假案號。
3. 摘要內容必須精準貼合該裁判/函釋之核心意旨，並針對本案說明如何引用以為上訴理由。

案件摘要與攻防重點：${caseSummary || "無"}

請嚴格輸出 JSON 格式陣列（切勿附加 markdown 標記或額外說明文字）：
[
  {
    "type": "最高法院刑事判例/最高法院刑事判決/刑事大法庭裁定/行政函釋",
    "citation": "完整真實字號（必須可由 TLR 查到）",
    "summary": "該裁判/函釋之核心要旨（白話精簡精準摘要）",
    "applicationReason": "本案運用說明：如何據以論駁原審或補強我方上訴理由"
  }
]
`;
      let responseText = "";
      try {
        const result = await generateContentWithFallback(ai, prompt, true);
        responseText = result.text;
      } catch (gErr) {
        console.warn("Search precedents AI call failed; returning fail-closed result:", gErr);
        return res.json(buildPrecedentFallback(gErr));
      }
      let parsedData = [];
      try {
        const strictData = parseStrictJson(responseText);
        if (!Array.isArray(strictData)) throw new Error("Expected JSON array");
        parsedData = strictData;
      } catch (pErr) {
        console.warn("Direct JSON parse failed; returning fail-closed result:", pErr);
        return res.json(buildPrecedentFallback(pErr));
      }
      try {
        const verifiedPrecedents = await verifyPrecedents(parsedData, (citation) => searchTlr(fetch, citation));
        return res.json({ precedents: verifiedPrecedents });
      } catch (verificationError) {
        console.warn("Precedent verification failed; returning fail-closed result:", verificationError);
        return res.json(buildPrecedentFallback(verificationError));
      }
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
        const result = await generateContentWithFallback(ai, prompt, false);
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
