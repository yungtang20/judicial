import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { getGenerateAppealPetitionPrompt } from "../../src/prompts/generate-appeal-petition.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackPetition } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument, assertGeneratedDocumentVerified } from "../../src/lib/generatedDocumentPipeline.js";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";

const router = Router();

router.post("/api/generate-appeal-petition", async (req: Request, res: Response) => {
  const {
    caseNumber: legacyCaseNumber,
    caseNo,
    caseType,
    courtName,
    appealCourtName,
    sectionCode,
    claimAmount,
    judgmentDeliveryDate,
    appellantName,
    appellantRole,
    appellantId,
    appellantAddress,
    appellantPhone,
    appellantLegalRep,
    appelleeName,
    appelleeRole,
    appelleeAddress,
    deliveryAgent,
    deliveryAddress,
    claims,
    issues,
    evidences,
    selectedPrecedents,
    judgmentSummary: legacyJudgmentSummary,
    selectedErrors: legacySelectedErrors,
    newEvidence: legacyNewEvidence,
    appealScope: legacyAppealScope
  } = req.body;

  // Accept the current UI contract while retaining compatibility with the
  // original API field names used by older clients.
  const normalized = {
    caseNo: caseNo || legacyCaseNumber,
    caseType,
    courtName,
    appealCourtName,
    sectionCode,
    claimAmount,
    judgmentDeliveryDate,
    appellantName,
    appellantRole,
    appellantId,
    appellantAddress,
    appellantPhone,
    appellantLegalRep,
    appelleeName,
    appelleeRole,
    appelleeAddress,
    deliveryAgent,
    deliveryAddress,
    claims: claims || legacyAppealScope,
    issues: Array.isArray(issues) ? issues : legacySelectedErrors,
    evidences: Array.isArray(evidences) ? evidences : legacyNewEvidence,
    selectedPrecedents,
    judgmentSummary: legacyJudgmentSummary
  };

  const unreadCitations = findUnreadRetrievedCitations(normalized.selectedPrecedents);
  if (unreadCitations.length > 0) {
    return res.status(422).json({ error: '檢索裁判尚未取得全文，拒絕將未讀取來源帶入生成', code: 'CITATION_FULLTEXT_REQUIRED', citations: unreadCitations.map(item => item.citation) });
  }

  // Pre-check
  const combinedInput = JSON.stringify({
    judgmentSummary: normalized.judgmentSummary,
    issues: normalized.issues,
    evidences: normalized.evidences,
    claims: normalized.claims
  });
  const precheck = precheckLegalInput(combinedInput, "generation");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const prompt = getGenerateAppealPetitionPrompt(normalized);
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    const petitionText = aiRes.text;

    // Verify
    const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(petitionText));

    res.json({
      petitionText: verified.documentText,
      antiGhostVerification: verified.antiGhostVerification
    });
  } catch (err: any) {
    console.warn("[GenerateAppealPetition] AI 調用異常或檢核未通過，安全降級至本機審定書狀庫:", err?.message || err);
    try {
      const fallbackText = buildFallbackPetition({
        caseNumber: normalized.caseNo || "113年度上字第123號",
        appellantName: normalized.appellantName || "上訴人",
        appelleeName: normalized.appelleeName || "被上訴人",
        courtName: normalized.courtName || "臺灣高等法院",
        caseType: normalized.caseType || "CIVIL",
        judgmentSummary: normalized.judgmentSummary || "原審判決認事用法顯有重大違誤",
        appealScope: normalized.claims || "原判決不利於上訴人部分廢棄"
      });
      const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(fallbackText));
      res.json({
        petitionText: verified.documentText,
        antiGhostVerification: verified.antiGhostVerification
      });
    } catch (fallbackErr: any) {
      return res.status(422).json({
        error: fallbackErr?.message || '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
        code: 'DOCUMENT_VERIFICATION_FAILED'
      });
    }
  }
});

export default router;
