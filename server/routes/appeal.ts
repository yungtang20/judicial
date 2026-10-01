import { Router, Request, Response } from "express";
import { describePrecheckRejection } from "../../src/lib/precheckRejectionMessage.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { officialPrecheckOptions } from "../services/statuteExistenceProvider.js";
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
  const precheck = precheckLegalInput(combinedInput, "generation", officialPrecheckOptions());
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: describePrecheckRejection(precheck),
      issues: precheck.issues
    });
  }
  // 上訴狀屬法院書狀，交付前必須取得 P4–P9 Final Gate 的 READY 授權。
  // 目前目錄中尚未建立「上訴理由狀」經核准的書狀結構與 rule profile
  // （見 src/lib/rules/courtPleadingRuleProfiles.ts），因此這條路徑無法取得授權。
  // 這裡必須 fail-closed，但不得留下不可達的後續程式碼誤導維護者，
  // 也不得以裸 fetch／未認證請求讓使用者誤以為只是暫時性失敗。
  return res.status(409).json({
    error: '上訴理由狀尚未開放正式產製：系統不會交付未經核准的法院書狀，因為結構或引用有誤的文件反而會讓上訴被駁回。',
    code: 'P9_FINAL_GATE_REQUIRED',
    detail: {
      reason: 'CANONICAL_STRUCTURE_NOT_APPROVED',
      guidance: '你的上訴權不受影響，上訴期間也不因系統未開放而延長或縮短。以下是可以立刻採取的步驟：'
        + '一、先確認上訴期間：民事為判決送達後二十日之不變期間（民訴§440），扣除在途期間。'
        + '逾期間即喪失上訴權，這是最不能錯的一步，請優先確認。'
        + '二、上訴理由狀應記載：上訴人與判決案號、上訴主張（請求撤銷原判或變更之範圍）、'
        + '事實與理由（原判違背法令之處）、所舉證據。'
        + '三、向承辦法院或民間司法改革基金會索取上訴理由狀空白範本（法院各股室與服務處均可提供）。'
        + '四、本工具已整理好的爭點、判例與調查證據清單，可直接作為撰寫時的骨架。',
      reference: 'src/lib/rules/courtPleadingRuleProfiles.ts'
    }
  });
});

export default router;
