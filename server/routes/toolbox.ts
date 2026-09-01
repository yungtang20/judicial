import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { getLegalToolboxPrompt } from "../../src/prompts/toolbox-prompts.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackToolboxResult } from "../../src/utils/toolboxFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { LEGAL_TOOL_TITLES } from "../../src/lib/legalToolTitles.js";

const router = Router();

// 1. Generate Toolbox Document
router.post("/api/toolbox/generate", async (req: Request, res: Response) => {
  const { toolId, toolCategory, toolTitle, params } = req.body;
  const categoryKey = toolCategory || toolId || "CRIMINAL_COMPLAINT_TRAFFIC";
  const resolvedTitle = toolTitle || (toolId && LEGAL_TOOL_TITLES[toolId]) || "法律文書";

  const serializedInput = JSON.stringify(params || {});
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
      const antiGhost = verifyGeneratedDocument(parsed.documentText);
      parsed.antiGhostVerification = antiGhost;
    }

    res.json(parsed);
  } catch (err: any) {
    console.warn("[ToolboxGenerate] AI 降級至本機工具庫:", err.message);
    const fallback = buildFallbackToolboxResult(categoryKey, params || {});
    res.json(fallback);
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
