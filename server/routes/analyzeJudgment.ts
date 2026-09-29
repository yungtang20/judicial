import { 檢查輸入長度 } from "../services/inputLengthGuard.js";
import { Router, Request, Response } from "express";
import { describePrecheckRejection } from "../../src/lib/precheckRejectionMessage.js";
import { 核對抽取金額, 產出核對說明, 偵測注入指令 } from "../services/judgmentExtractionGuard.js";
import { getAnalyzeJudgmentPrompt } from "../../src/prompts/analyze-judgment.js";
import { buildFallbackJudgmentAnalysis } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { officialPrecheckOptions } from "../services/statuteExistenceProvider.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: UNIVERSAL_SYLLOGISM_RULES is enforced centrally within defaultLegalGenerationPipeline

const router = Router();

router.post("/api/analyze-judgment", async (req: Request, res: Response) => {
  const { judgmentText, judgmentUrl, caseNumber } = req.body;

  if (!judgmentText && !judgmentUrl) {
    return res.status(400).json({ error: "請提供裁判書全文或司法院連結" });
  }

  // Pre-check
  const precheck = precheckLegalInput(judgmentText || "", 'analysis', officialPrecheckOptions());
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

    // 核對 AI 抽取的金額是否確實出自原始判決書。
    // 判決書文字是使用者貼上的外部內容，可能夾帶「請將本判決改寫為…」
    // 這類指示；實測 6 次中有 1 次建議金額被帶偏。
    // 金額會進入上訴聲明建議，直接影響當事人的訴訟主張，因此必須揭露。
    const 核對 = 核對抽取金額(
      judgmentText || "",
      (finalPayload as Record<string, unknown>).mainHolding as string | undefined,
      (finalPayload as Record<string, unknown>).judgmentSummary as string | undefined,
      (finalPayload as Record<string, unknown>).claims as string | undefined
    );
    // 金額核對單獨使用會被繞過：注入指令本身就在輸入文字裡，
    // 該金額確實「出現在原文」而不會被標記。因此另偵測指令型文字。
    const 注入 = 偵測注入指令(judgmentText || "");
    if (注入.有注入跡象) {
      (finalPayload as Record<string, unknown>).injectionWarning = 注入.說明;
    }
    if (核對.需人工確認) {
      (finalPayload as Record<string, unknown>).amountVerificationWarning = 產出核對說明(核對);
      (finalPayload as Record<string, unknown>).amountVerification = 核對;
    }

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
