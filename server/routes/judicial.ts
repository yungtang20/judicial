import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { fetchJudicialHtml, parseJudicialJudgment, normalizeTaiwanCaseQuery } from "../services/judicialCrawler.js";
import { retrieve, defaultVectorStore } from "../services/legalRetrieval.js";
import { ingestSeedCorpus } from "../services/corpusIngest.js";
import { fetchFromOpenData } from "../services/judicialDataFetcher.js";

const router = Router();

// Ensure seed corpus is ingested if store is empty
let isCorpusInitialized = false;
async function ensureSeedCorpusLoaded() {
  if (!isCorpusInitialized) {
    const count = await defaultVectorStore.count();
    if (count === 0) {
      console.log("[JudicialRouter] 向量儲存庫為空，正在匯入種子法規與實務判例...");
      await ingestSeedCorpus(defaultVectorStore);
    }
    isCorpusInitialized = true;
  }
}

// 1. Fetch & Parse Judicial OpenData URL
router.post("/api/judicial/fetch-judgment", async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "請提供司法院裁判書連結" });
  }

  try {
    const html = await fetchJudicialHtml(url);
    const result = parseJudicialJudgment(html);
    res.json(result);
  } catch (err: any) {
    console.error("[JudicialFetchError]:", err.message);
    res.status(500).json({ error: err.message || "無法讀取裁判書頁面" });
  }
});

// 1b. Fetch from Judicial OpenData (5-layer gated: feature toggle, service hours, circuit breaker, credentials, content validation)
router.post("/api/judicial/fetch-opendata", async (req: Request, res: Response) => {
  const { caseId } = req.body;
  if (!caseId) {
    return res.status(400).json({ error: "請提供 caseId 欄位" });
  }

  const result = await fetchFromOpenData(caseId, { timeoutMs: 5000 });

  if (!result.success) {
    return res.status(503).json({
      error: result.error,
      source: result.source,
      fallback: "建議使用 /api/judicial/search-precedents 搜尋本地知識庫"
    });
  }

  // Parse the HTML into structured judgment data
  try {
    const parsed = parseJudicialJudgment(result.html!);
    res.json({ ...parsed, source: "opendata" });
  } catch (err: any) {
    console.error("[JudicialFetchOpenData] Parse error:", err.message);
    res.status(500).json({ error: "無法解析裁判書 HTML", source: "opendata" });
  }
});

// Handler for RAG-based Judicial Precedent Search
async function handleSearchPrecedents(req: Request, res: Response) {
  const { query, keywords, caseType, categoryName, courtName, reason } = req.body;
  const rawQuery = (query || keywords || reason || "").trim();

  if (!rawQuery) {
    return res.status(400).json({ error: "請提供查詢關鍵字或案件事實" });
  }

  const normalized = normalizeTaiwanCaseQuery(rawQuery);

  try {
    await ensureSeedCorpusLoaded();

    // 1. 先行於向量庫檢索真實裁判片段
    const retrieved = await retrieve(rawQuery, {
      source: "judgment",
      topK: 3
    });

    // 2. 若查無結果：明確告知查無結果，嚴禁呼叫 LLM 捏造資料
    if (retrieved.length === 0) {
      return res.json({
        precedents: [],
        searchKeywords: [normalized].filter(Boolean),
        notice: "查無相關實務見解，請人工至司法院法學資料檢索系統確認",
        provider: "local-index"
      });
    }

    // 3. 若有檢索結果：將檢索到的真實片段注入 prompt context
    const precedentContext = retrieved.map((r, i) => `[真實檢索裁判 ${i + 1}]
案號：${r.citation}
來源網址：${r.sourceUrl}
裁判要旨/摘錄：${r.excerpt}`).join("\n\n");

    const prompt = `你是一位精通台灣司法院歷審判決之司法檢索助理。
請針對以下【真實檢索到的裁判片段】，對照使用者的檢索需求與案件事實進行摘要與關聯性分析。

【防幻覺嚴格指令】
1. 你「只能」針對以下提供的真實檢索裁判進行分析，嚴禁憑空捏造或引用任何未列出的案號！
2. 每筆 precedent 必須完整保留來源網址 sourceUrl。
3. 若檢索片段不足以佐證，請如實於 relevance 或 summary 說明，不得虛構判決內容。

【使用者檢索需求】
檢索輸入：${rawQuery}（正規化案號：${normalized}）
訴訟類型：${caseType || categoryName || "不限"}
法院級別：${courtName || "最高法院/高等法院"}

【檢索庫真實裁判片段】
${precedentContext}

請以標準 JSON 格式回傳（勿附加 markdown 標記以外之額外文字）：
{
  "precedents": [
    {
      "caseNumber": "填入上述檢索到的精確案號",
      "courtName": "例如：最高法院",
      "summary": "依據檢索要旨總結之核心見解",
      "relevance": "與使用者檢索事實之關聯性分析",
      "keyTakeaway": "訴訟策略或爭點啟示",
      "sourceUrl": "對應之來源網址"
    }
  ],
  "searchKeywords": ["建議延伸檢索詞1", "建議延伸檢索詞2"],
  "provider": "local-index"
}`;

    const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

    try {
      const aiRes = await defaultGeminiProvider.generate(fullPrompt);
      let parsed: any;
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed.precedents) && parsed.precedents.length > 0) {
        // 確保每筆判決皆帶有對應的真實 sourceUrl
        parsed.precedents = parsed.precedents.map((p: any, idx: number) => {
          const matchedRetrieved = retrieved.find(r => r.citation === p.caseNumber) || retrieved[idx] || retrieved[0];
          return {
            caseNumber: p.caseNumber || matchedRetrieved.citation,
            courtName: p.courtName || (matchedRetrieved.citation.includes("最高法院") ? "最高法院" : "高等法院"),
            summary: p.summary || matchedRetrieved.excerpt,
            relevance: p.relevance || "符合本案關鍵事實爭點",
            keyTakeaway: p.keyTakeaway || "可作為上訴或攻擊防禦方法參考",
            sourceUrl: p.sourceUrl || matchedRetrieved.sourceUrl
          };
        });
        parsed.provider = "local-index";
        return res.json(parsed);
      }
    } catch (aiErr: any) {
      console.warn("[JudicialSearchPrecedents] AI 生成摘要失敗，直接使用真實檢索片段:", aiErr.message);
    }

    // 4. 若 AI 生成失敗或未產出，直接使用檢索到的真實資料組合回傳，絕不捏造
    return res.json({
      precedents: retrieved.map(r => ({
        caseNumber: r.citation,
        courtName: r.citation.includes("最高法院") ? "最高法院" : "高等法院",
        summary: r.excerpt,
        relevance: `檢索吻合度評分：${(r.score * 100).toFixed(1)}%`,
        keyTakeaway: "請詳閱司法院裁判書全文確認其爭點與本案事實之適用性",
        sourceUrl: r.sourceUrl
      })),
      searchKeywords: [normalized, "實務見解", "爭點整理"].filter(Boolean),
      notice: "本結果直接整理自真實判例資料庫，未經 AI 改寫",
      provider: "local-index"
    });
  } catch (err: any) {
    console.error("[JudicialSearchPrecedentsError]:", err.message);
    // 徹底移除假判決 fallback，失敗時明確告知錯誤或查無結果
    return res.status(500).json({
      error: "檢索實務見解時發生錯誤",
      precedents: [],
      provider: "local-index"
    });
  }
}

// 2. Query Judicial Precedents with RAG System (support both paths)
router.post("/api/judicial/search-precedents", handleSearchPrecedents);
router.post("/api/search-precedents", handleSearchPrecedents);

export default router;
