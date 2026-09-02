import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { getLegalToolboxPrompt } from "../../src/prompts/toolbox-prompts.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackToolboxResult } from "../../src/utils/toolboxFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument, assertGeneratedDocumentVerified } from "../../src/lib/generatedDocumentPipeline.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { LEGAL_TOOL_TITLES } from "../../src/lib/legalToolTitles.js";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";

const router = Router();

// 1. Generate Toolbox Document
router.post("/api/toolbox/generate", async (req: Request, res: Response) => {
  const { toolId, toolCategory, toolTitle, params } = req.body;
  const categoryKey = toolCategory || toolId || "CRIMINAL_COMPLAINT_TRAFFIC";
  const resolvedTitle = toolTitle || (toolId && LEGAL_TOOL_TITLES[toolId]) || "法律文書";

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

  const prompt = getLegalToolboxPrompt(categoryKey, params || {});
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        documentTitle: resolvedTitle,
        documentText: aiRes.text,
        legalCitations: [],
        strategicAdvice: "已產製完成，請詳加核對事實及證據資料。"
      };
    }

    // Auto verification
    if (parsed.documentText) {
      const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(parsed.documentText));
      parsed.documentText = verified.documentText;
      parsed.antiGhostVerification = verified.antiGhostVerification;
    }

    res.json(parsed);
  } catch (err: any) {
    console.warn("[ToolboxGenerate] AI 產製或檢核未通過，安全降級至本機審定工具庫:", err?.message || err);
    try {
      const fallback = buildFallbackToolboxResult(categoryKey, params || {});
      const verified = assertGeneratedDocumentVerified(verifyGeneratedDocument(fallback.documentText));
      res.json({
        ...fallback,
        documentText: verified.documentText,
        antiGhostVerification: verified.antiGhostVerification,
        disclaimer: `${fallback.disclaimer}（本文件已自動套用審定法規標準範本，防幽靈引用檢核合規）`
      });
    } catch (fallbackErr: any) {
      return res.status(422).json({
        error: fallbackErr?.message || '法律文件引用檢核未通過，拒絕回傳未確認引用文件',
        code: 'DOCUMENT_VERIFICATION_FAILED'
      });
    }
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
