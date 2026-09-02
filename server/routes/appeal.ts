import { Router, Request, Response } from "express";
import { getGenerateAppealPetitionPrompt } from "../../src/prompts/generate-appeal-petition.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";
import { buildFallbackPetition } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: verifyGeneratedDocument and UNIVERSAL_SYLLOGISM_RULES are enforced centrally within defaultLegalGenerationPipeline
void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];

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

  const ragQuery = [
    normalized.caseNo,
    normalized.caseType,
    typeof normalized.claims === 'string' ? normalized.claims.slice(0, 80) : '',
    Array.isArray(normalized.issues) ? normalized.issues.map((i: any) => typeof i === 'string' ? i : (i?.title || '')).join(' ').slice(0, 80) : ''
  ].filter(Boolean).join(' ') || '上訴理由實務裁判';

  try {
    const pipelineResult = await defaultLegalGenerationPipeline.execute({
      ragQuery,
      buildPrompt: () => getGenerateAppealPetitionPrompt(normalized),
      fallback: () => ({
        documentText: buildFallbackPetition({
          caseNumber: normalized.caseNo || "113年度上字第123號",
          appellantName: normalized.appellantName || "上訴人",
          appelleeName: normalized.appelleeName || "被上訴人",
          courtName: normalized.courtName || "臺灣高等法院",
          caseType: normalized.caseType || "CIVIL",
          judgmentSummary: normalized.judgmentSummary || "原審判決認事用法顯有重大違誤",
          appealScope: normalized.claims || "原判決不利於上訴人部分廢棄"
        })
      })
    });

    res.json({
      petitionText: pipelineResult.documentText,
      antiGhostVerification: pipelineResult.antiGhostVerification,
      legalSources: pipelineResult.legalSources,
      isExternalRetrievalUsed: pipelineResult.isExternalRetrievalUsed,
      retrievalStatusMessage: pipelineResult.retrievalStatusMessage
    });
  } catch (err: any) {
    console.warn("[GenerateAppealPetition] Pipeline 執行未通過或被攔截:", err?.message || err);
    return res.status(422).json({
      error: err?.message || '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
      code: 'DOCUMENT_VERIFICATION_FAILED'
    });
  }
});

export default router;
