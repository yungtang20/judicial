import { Router, Request, Response } from "express";
import { defaultGeminiProvider } from "../../src/ai/providers/GeminiProvider.js";
import { getGenerateAppealPetitionPrompt } from "../../src/prompts/generate-appeal-petition.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackPetition } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";

const router = Router();

router.post("/api/generate-appeal-petition", async (req: Request, res: Response) => {
  const {
    caseNumber,
    caseType,
    courtName,
    appellantName,
    appelleeName,
    judgmentSummary,
    selectedErrors,
    newEvidence,
    appealScope
  } = req.body;

  // Pre-check
  const combinedInput = `${judgmentSummary || ''} ${selectedErrors || ''} ${newEvidence || ''}`;
  const precheck = precheckLegalInput(combinedInput, "generation");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const prompt = getGenerateAppealPetitionPrompt({
    caseNumber,
    caseType,
    courtName,
    appellantName,
    appelleeName,
    judgmentSummary,
    selectedErrors,
    newEvidence,
    appealScope
  });
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    const petitionText = aiRes.text;

    // Verify
    const antiGhost = verifyGeneratedDocument(petitionText);

    res.json({
      petitionText,
      antiGhostVerification: antiGhost
    });
  } catch (err: any) {
    console.warn("[GenerateAppealPetition] AI 調用異常，降級至本機書狀產生庫:", err.message);
    const fallbackText = buildFallbackPetition({
      caseNumber: caseNumber || "113年度上字第123號",
      appellantName: appellantName || "上訴人",
      appelleeName: appelleeName || "被上訴人",
      courtName: courtName || "臺灣高等法院",
      caseType: caseType || "CIVIL",
      judgmentSummary: judgmentSummary || "原審判決認事用法顯有重大違誤",
      appealScope: appealScope || "原判決不利於上訴人部分廢棄"
    });
    const antiGhost = verifyGeneratedDocument(fallbackText);
    res.json({
      petitionText: fallbackText,
      antiGhostVerification: antiGhost
    });
  }
});

export default router;
