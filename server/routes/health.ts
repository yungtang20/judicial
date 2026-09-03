import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";

const router = Router();

router.get("/api/health", async (req: Request, res: Response) => {
  const providerStatus = await defaultGeminiProvider.healthCheck();
  const tlrEnabled = process.env.TLR_ENABLED === 'true';
  res.json({
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    version: "2.0.0-modular",
    aiProvider: providerStatus,
    legalToolsCount: LEGAL_TOOLS.length,
    syllogismRulesActive: true,
    citationVerifierActive: true,
    tlrStatus: {
      enabled: tlrEnabled,
      baseUrlConfigured: !!process.env.TLR_BASE_URL,
      apiKeyConfigured: !!process.env.TLR_API_KEY
    }
  });
});

export default router;
