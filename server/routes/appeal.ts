import { Router, Request, Response } from "express";
import { getGenerateAppealPetitionPrompt } from "../../src/prompts/generate-appeal-petition.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";
import { buildFallbackPetition } from "../../src/utils/fallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: verifyGeneratedDocument and UNIVERSAL_SYLLOGISM_RULES are enforced centrally within defaultLegalGenerationPipeline

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
  // 上訴狀屬法院書狀，交付前必須取得 P4–P9 Final Gate 的 READY 授權。
  // 目前目錄中尚未建立「上訴理由狀」經核准的書狀結構與 rule profile
  // （見 src/lib/rules/courtPleadingRuleProfiles.ts），因此這條路徑無法取得授權。
  // 這裡必須 fail-closed，但不得留下不可達的後續程式碼誤導維護者，
  // 也不得以裸 fetch／未認證請求讓使用者誤以為只是暫時性失敗。
  return res.status(409).json({
    error: '上訴理由狀尚未開放正式產製：此類書狀尚未建立經核准的格式結構與合規規則，系統不會交付未經授權的法院書狀。',
    code: 'P9_FINAL_GATE_REQUIRED',
    detail: {
      reason: 'CANONICAL_STRUCTURE_NOT_APPROVED',
      guidance: '請改用「全方位實用法務工具箱」中已開放的書狀類型；上訴理由狀開放後會另行公告。',
      reference: 'src/lib/rules/courtPleadingRuleProfiles.ts'
    }
  });
});

export default router;
