import { Router, Request, Response } from "express";
import { defaultGeminiProvider } from "../../src/ai/providers/GeminiProvider.js";
import { getAnalyzeJudgmentPrompt } from "../../src/prompts/analyze-judgment.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackJudgmentAnalysis } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";

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

  const prompt = getAnalyzeJudgmentPrompt(judgmentText || "", judgmentUrl, caseNumber);
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallbackJudgmentAnalysis(judgmentText || "裁判書內容");
    }

    // Auto verify
    const stringified = JSON.stringify(parsed);
    const antiGhost = verifyGeneratedDocument(stringified);
    parsed.antiGhostVerification = antiGhost;

    res.json(parsed);
  } catch (err: any) {
    console.warn("[AnalyzeJudgment] AI 調用異常，降級至本機三段論法分析庫:", err.message);
    const fallback = buildFallbackJudgmentAnalysis(judgmentText || "裁判書內容");
    res.json(fallback);
  }
});

export default router;
