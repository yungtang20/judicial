import { Router, Request, Response } from "express";
import { getLegalToolboxPrompt } from "../../src/prompts/toolbox-prompts.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { verifyGeneratedDocument, assertGeneratedDocumentVerified } from "../../src/lib/generatedDocumentPipeline.js";
import {
  blockProductionToolboxFallback,
  ProductionToolboxFallbackBlockedError
} from "../../src/utils/toolboxFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { LEGAL_TOOL_TITLES } from "../../src/lib/legalToolTitles.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";
import { evaluatePleadingDelivery } from "../../src/lib/finalGate/pleadingExportGate.js";

import { isCourtPleadingToolCategory } from "../../src/lib/finalGate/pleadingExportGate.js";
import { executeCanonicalPleadingPipeline } from "../services/canonicalPleadingPipeline.js";

// Enforced via defaultLegalGenerationPipeline
void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument, assertGeneratedDocumentVerified];

const router = Router();

// 1. Generate Toolbox Document
router.post("/api/toolbox/generate", async (req: Request, res: Response) => {
  const { toolId, toolCategory, params } = req.body;
  const rawCategory = toolCategory || toolId;
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) {
    return res.status(400).json({
      error: '必須提供有效的法律工具類別',
      code: 'TOOLBOX_CATEGORY_REQUIRED'
    });
  }
  const categoryKey = rawCategory.trim().toUpperCase();
  const registeredTool = LEGAL_TOOLS.find(tool => tool.id === categoryKey);
  const knownLegacyCategory = Object.prototype.hasOwnProperty.call(LEGAL_TOOL_TITLES, categoryKey);
  if (!registeredTool && !knownLegacyCategory) {
    return res.status(400).json({
      error: '不支援或未知的法律工具類別',
      code: 'UNKNOWN_TOOLBOX_CATEGORY'
    });
  }
  // Display titles are server-owned. A request-provided title must not alter
  // classification or make one category masquerade as another document type.
  const resolvedTitle = registeredTool?.name || LEGAL_TOOL_TITLES[categoryKey] || "法律文書";

  const serializedInput = JSON.stringify(params || {});

  const unreadCitations = findUnreadRetrievedCitations((params || {}).selectedPrecedents || (params || {}).candidateCitations);
  if (unreadCitations.length > 0) {
    return res.status(422).json({ error: '檢索裁判尚未取得全文，拒絕將未讀取來源帶入生成', code: 'CITATION_FULLTEXT_REQUIRED', citations: unreadCitations.map(item => item.citation) });
  }
  const precheck = precheckLegalInput(serializedInput, "generation");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  // Trust boundary: this legacy route does not execute P4-P9 and therefore can
  // never possess a server-owned P9 authorization. Request-supplied gate data
  // is intentionally ignored. Court pleadings remain blocked until a trusted
  // adapter passes a P9-issued authorization here.
  const deliveryDecision = evaluatePleadingDelivery(categoryKey);
  if (!deliveryDecision.allowed && !isCourtPleadingToolCategory(categoryKey)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(409).json({
      error: deliveryDecision.message,
      code: deliveryDecision.code,
      deliveryGate: {
        required: true,
        status: 'BLOCKED',
        authorizedActions: []
      }
    });
  }

  if (isCourtPleadingToolCategory(categoryKey)) {
    try {
      const canonicalPayload = await executeCanonicalPleadingPipeline(categoryKey, params || {});
      return res.json(canonicalPayload);
    } catch (err: any) {
      console.warn("[ToolboxGenerate] Canonical Pipeline Error:", err?.message || err);
      return res.status(422).json({
        error: err?.message || '書狀合規產製未通過 P9 最終守門員',
        code: 'P9_FINAL_GATE_FAILED'
      });
    }
  }

  const ragQuery = `${resolvedTitle} ${params?.briefFacts || params?.noteReason || params?.claims || ""}`.slice(0, 120).trim() || resolvedTitle;

  try {
    const pipelineResult = await defaultLegalGenerationPipeline.execute({
      ragQuery,
      buildPrompt: () => getLegalToolboxPrompt(categoryKey, params || {}),
      parseResponse: (rawText) => {
        let parsed: any;
        try {
          const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = {
            documentTitle: resolvedTitle,
            documentText: rawText,
            legalCitations: [],
            strategicAdvice: "已產製完成，請詳加核對事實及證據資料。"
          };
        }
        return {
          documentText: parsed.documentText || rawText,
          payload: parsed
        };
      },
      fallback: () => {
        return blockProductionToolboxFallback(categoryKey);
      }
    });

    const verified = pipelineResult;
    const finalPayload = {
      ...(pipelineResult.payload || {}),
      documentText: verified.documentText || (pipelineResult.payload as any).documentText,
      antiGhostVerification: verified.antiGhostVerification,
      legalSources: verified.legalSources,
      isExternalRetrievalUsed: verified.isExternalRetrievalUsed,
      retrievalStatusMessage: verified.retrievalStatusMessage
    };

    res.json(finalPayload);
  } catch (err: any) {
    console.warn("[ToolboxGenerate] Pipeline 執行異常或檢核未通過:", err?.message || err);
    const fallbackBlocked = err instanceof ProductionToolboxFallbackBlockedError;
    return res.status(fallbackBlocked ? 503 : 422).json({
      error: err?.message || '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
      code: fallbackBlocked ? err.code : 'DOCUMENT_VERIFICATION_FAILED'
    });
  }
});

// 2. Citation Verification Endpoint
router.post("/api/toolbox/verify-citations", (req: Request, res: Response) => {
  const { documentText } = req.body;
  if (!documentText) {
    return res.status(400).json({ error: "請提供欲檢核之法律文件內容" });
  }

  const raw = verifyLegalCitations(documentText);
  res.json({
    antiGhostVerification: {
      totalCitationsChecked: raw.totalChecked,
      ghostCitationsFound: raw.ghostCount,
      verifiedCitations: raw.results
    }
  });
});

export default router;
