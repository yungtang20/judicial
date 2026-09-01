import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";

const router = Router();

router.get("/api/health", async (req: Request, res: Response) => {
  const providerStatus = await defaultGeminiProvider.healthCheck();
  res.json({
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    version: "2.0.0-modular",
    aiProvider: providerStatus,
    legalToolsCount: LEGAL_TOOLS.length,
    syllogismRulesActive: true,
    citationVerifierActive: true
  });
});

export default router;
