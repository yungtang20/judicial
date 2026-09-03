import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";
import { defaultLocalKnowledgeBase } from "../knowledge-base/localKnowledgeBase.js";

const router = Router();

router.get("/api/health", async (req: Request, res: Response) => {
  const providerStatus = await defaultGeminiProvider.healthCheck();

  // TLR（Tool-Legal-Rule）狀態檢查
  const legalToolCategories = [...new Set(LEGAL_TOOLS.map(t => t.category))];
  const localKnowledgeBaseReady = defaultLocalKnowledgeBase.isReady?.() ?? false;

  res.json({
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    version: "2.0.0-modular",
    aiProvider: providerStatus,
    legalToolsCount: LEGAL_TOOLS.length,
    legalToolCategories,
    syllogismRulesActive: true,
    citationVerifierActive: true,
    triageRulesActive: true,
    localKnowledgeBaseReady
  });
});

export default router;
