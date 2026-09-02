import { Router, Request, Response } from "express";
import { getAnalyzeJudgmentPrompt } from "../../src/prompts/analyze-judgment.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackJudgmentAnalysis } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: UNIVERSAL_SYLLOGISM_RULES is enforced centrally within defaultLegalGenerationPipeline
void [UNIVERSAL_SYLLOGISM_RULES];

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
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
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
          documentText: "", // Bypass citation check for predefined rule engine
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
    res.json(fallback);
  }
});

export default router;
