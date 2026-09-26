import { Router, Request, Response } from "express";
import { getLegalToolboxPrompt } from "../../src/prompts/toolbox-prompts.js";
import { verifyGeneratedDocument, assertGeneratedDocumentVerified, verifyGeneratedDocumentWithOfficialSources } from "../../src/lib/generatedDocumentPipeline.js";
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
import { buildFallbackToolboxResult, hasDeterministicToolboxTemplate } from "../../src/utils/toolboxFallbacks.js";
import { verifyOfficialCitations } from "../services/officialCitationVerification.js";

// Enforced via defaultLegalGenerationPipeline

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
    res.setHeader('Cache-Control', 'no-store');
    try {
      const canonicalPayload = await executeCanonicalPleadingPipeline(categoryKey, params || {});
      return res.json(canonicalPayload);
    } catch (err: any) {
      console.warn("[ToolboxGenerate] Canonical Pipeline Error:", err?.message || err);
      return res.status(422).json({
        error: err?.message || '書狀合規產製未通過 P9 最終守門員',
        code: err?.code || 'P9_FINAL_GATE_FAILED',
        ...(Array.isArray(err?.missingInputs) ? { missingInputs: err.missingInputs } : {})
      });
    }
  }

  // 有完整確定性模板的類別直接走確定性路徑，不呼叫 AI 起草。
  //
  // 原因：模板本身就是確定性產物，沒有幻覺風險，產出也不會因模型隨機性
  // 而每次不同；而且 AI 偶爾多寫一句法條，就會被引用查核擋下整份文件。
  // 實測先前一律走 AI，28 項工具中有 19 項產製失敗，同一輸入產出還不穩定。
  //
  // 這不放寬治理：確定性產出照樣經過 verifyGeneratedDocument 與官方查核，
  // 查核不通過仍由 assertGeneratedDocumentVerified 擋下交付。
  if (hasDeterministicToolboxTemplate(categoryKey)) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const deterministic = buildFallbackToolboxResult(categoryKey, params || {});
      const verified = await verifyGeneratedDocumentWithOfficialSources(
        deterministic.documentText,
        { allowedCitations: [], strictAllowedOnly: false },
        inputs => verifyOfficialCitations(inputs)
      );
      assertGeneratedDocumentVerified(verified);
      return res.json({
        ...deterministic,
        documentText: verified.documentText,
        antiGhostVerification: verified.antiGhostVerification,
        modelUsed: 'DETERMINISTIC_TEMPLATE',
        generationMode: 'DETERMINISTIC',
        retrievalStatusMessage: '已使用確定性法律模板產製（未呼叫 AI 起草）'
      });
    } catch (err: any) {
      console.warn("[ToolboxGenerate] 確定性模板產製或查核未通過:", err?.message || err);
      return res.status(422).json({
        error: err?.message || '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
        code: 'DOCUMENT_VERIFICATION_FAILED'
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
    const payload = (pipelineResult.payload || {}) as Record<string, unknown>;
    const finalPayload = {
      title: resolvedTitle,
      documentTitle: resolvedTitle,
      documentText: verified.documentText || (typeof payload.documentText === 'string' ? payload.documentText : ''),
      legalCitations: Array.isArray(payload.legalCitations) ? payload.legalCitations : [],
      strategicAdvice: typeof payload.strategicAdvice === 'string' ? payload.strategicAdvice : '已產製完成，請詳加核對事實及證據資料。',
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
  // status 是人工覆核閘門的唯一權威依據：未回傳 status 會讓前端把「未查核」誤讀為「已通過」。
  // 只有在整份文件掃描完成且未發現幽靈引用時才宣告 VERIFIED；
  // 任一處引用被判定為幽靈或虛構一律 FAIL，文件不得交付。
  const status: 'VERIFIED' | 'FAIL' = raw.ghostCount > 0 ? 'FAIL' : 'VERIFIED';
  res.json({
    antiGhostVerification: {
      status,
      totalCitationsChecked: raw.totalChecked,
      ghostCitationsFound: raw.ghostCount,
      verifiedCitations: raw.results
    }
  });
});

export default router;
