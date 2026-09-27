import { Router, Request, Response } from "express";
import { describePrecheckRejection } from "../../src/lib/precheckRejectionMessage.js";
import { getAnalyzeJudgmentPrompt } from "../../src/prompts/analyze-judgment.js";
import { buildFallbackJudgmentAnalysis } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: UNIVERSAL_SYLLOGISM_RULES is enforced centrally within defaultLegalGenerationPipeline

const router = Router();

router.post("/api/analyze-judgment", async (req: Request, res: Response) => {
  const { judgmentText, judgmentUrl, caseNumber } = req.body;

  if (!judgmentText && !judgmentUrl) {
    return res.status(400).json({ error: "請提供裁判書全文或司法院連結" });
  }

  // Pre-check
  const precheck = precheckLegalInput(judgmentText || "");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: describePrecheckRejection(precheck),
      issues: precheck.issues
    });
  }

  const ragQuery = caseNumber
    ? `${caseNumber} ${judgmentText ? judgmentText.slice(0, 100) : ""}`
    : (judgmentText ? judgmentText.slice(0, 150) : "裁判實務見解");

  try {
    const pipelineResult = await defaultLegalGenerationPipeline.execute({
      ragQuery,
      buildPrompt: () => getAnalyzeJudgmentPrompt(judgmentText || "", judgmentUrl, caseNumber),
      parseResponse: (rawText) => {
        let parsed: any;
        try {
          const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = buildFallbackJudgmentAnalysis(judgmentText || "裁判書內容");
        }
        return {
          documentText: JSON.stringify(parsed),
          payload: parsed
        };
      },
      fallback: () => {
        const fallback = buildFallbackJudgmentAnalysis(judgmentText || "裁判書內容");
        return {
          documentText: JSON.stringify(fallback),
          payload: fallback
        };
      }
    });

    const finalPayload = {
      ...(pipelineResult.payload || {}),
      antiGhostVerification: pipelineResult.antiGhostVerification,
      legalSources: pipelineResult.legalSources,
      isExternalRetrievalUsed: pipelineResult.isExternalRetrievalUsed,
      retrievalStatusMessage: pipelineResult.retrievalStatusMessage,
      disclaimer: pipelineResult.retrievalDisclaimer
    };

    res.json(finalPayload);
  } catch (err: any) {
    console.warn("[AnalyzeJudgment] Pipeline 異常:", err.message);
    const fallback: any = buildFallbackJudgmentAnalysis(judgmentText || "裁判書內容");

    // 降級有兩種截然不同的原因，對使用者的意義也完全不同：
    // 1. AI 服務不可用 → 範本是目前唯一能給的東西。
    // 2. AI 產出了分析，但因引用無法查證而被防幽靈引用閘門拒絕
    //    → 這是在告訴使用者「AI 可能捏造了裁判字號」，是重要訊號。
    // 先前兩者都只呈現為「備援範本」，使用者無從分辨。
    const 訊息 = String(err?.message || '');
    // 降級原因必須如實反映被哪一道機制擋下。
    // 實測同一個端點會因三種不同原因降級（AI 不可用／引用無法查證／產出含簡體），
    // 先前一律顯示「AI 服務暫時無法完成分析」——
    // 對使用者而言，AI 產出含簡體被擋與 AI 掛掉是完全不同的訊息。
    let 原因: 'AI_UNAVAILABLE' | 'CITATION_REJECTED' | 'SIMPLIFIED_OUTPUT' | 'EMPTY_OUTPUT' = 'AI_UNAVAILABLE';
    let 說明 = 'AI 服務暫時無法完成分析，已改用本機規則範本。';

    if (/引用檢核未通過|幽靈|ANTI.?GHOST|未確認引用/i.test(訊息)) {
      原因 = 'CITATION_REJECTED';
      說明 = 'AI 產出的分析因引用無法查證而被安全機制拒絕（AI 可能捏造裁判字號），已改用本機規則範本。';
    } else if (/簡體中文|繁體中文|簡轉繁|SIMPLIFIED/i.test(訊息)) {
      原因 = 'SIMPLIFIED_OUTPUT';
      說明 = 'AI 產出的分析含簡體中文用字，已依台灣法律文件用語要求擋下交付，已改用本機規則範本。';
    } else if (/空|EMPTY|無內容|沒有產生/i.test(訊息)) {
      原因 = 'EMPTY_OUTPUT';
      說明 = 'AI 未產生可用的分析內容，已改用本機規則範本。';
    }

    fallback.degradedReason = 原因;
    fallback.degradedDetail = 說明;
    fallback.rejectedCitation = 原因 === 'CITATION_REJECTED'
      ? (訊息.match(/涉及引用：「([^」]+)」/) || [])[1] || null
      : null;

    res.json(fallback);
  }
});

export default router;
