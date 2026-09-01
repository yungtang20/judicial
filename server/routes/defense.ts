import { Router, Request, Response } from "express";
import { defaultGeminiProvider } from "../../src/ai/providers/GeminiProvider.js";
import { getBPointTriagePrompt, getMineScanPrompt, getDefensePleadingPrompt } from "../../src/prompts/defense-workflow.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "../../src/utils/defenseFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument } from "../../src/lib/generatedDocumentPipeline.js";

const router = Router();

// 1. Triage
router.post("/api/defense/triage", async (req: Request, res: Response) => {
  const { clientInput, litigationRole, caseType, courtName, caseNo } = req.body;

  const precheck = precheckLegalInput(clientInput || "");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const prompt = getBPointTriagePrompt(clientInput || "", caseType || "civil", litigationRole || "", courtName, caseNo);
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallbackDefenseTriage(clientInput || "", caseType, courtName, caseNo);
    }
    res.json(parsed);
  } catch (err: any) {
    console.warn("[DefenseTriage] AI 降級至本機分析庫:", err.message);
    res.json(buildFallbackDefenseTriage(clientInput || "", caseType, courtName, caseNo));
  }
});

// 2. Mine Scan
router.post("/api/defense/scan-mines", async (req: Request, res: Response) => {
  const { clientInput, opponentClaims, caseType } = req.body;

  const precheck = precheckLegalInput(`${clientInput || ''} ${opponentClaims || ''}`);
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const prompt = getMineScanPrompt(clientInput || "", opponentClaims || "", caseType || "civil");
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallbackMineScan(clientInput || "");
    }
    res.json(parsed);
  } catch (err: any) {
    console.warn("[DefenseScanMines] AI 降級至本機地雷掃描庫:", err.message);
    res.json(buildFallbackMineScan(clientInput || ""));
  }
});

// 3. Generate Dual Pleading
router.post("/api/defense/generate-pleading", async (req: Request, res: Response) => {
  const {
    pleadingType = "LAWYER_PLEADING",
    clientInput = "",
    triageData = {},
    mineData = {},
    caseInfo = {
      caseType: "civil",
      courtName: "臺灣臺北地方法院",
      caseNo: "113年度訴字第1234號",
      clientRole: "被告",
      clientName: "當事人",
      opponentRole: "原告",
      opponentName: "對造"
    }
  } = req.body;

  const precheck = precheckLegalInput(clientInput, "generation");
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const prompt = getDefensePleadingPrompt(
    pleadingType,
    clientInput,
    triageData,
    mineData,
    caseInfo
  );
  const fullPrompt = `${prompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    const pleadingText = aiRes.text;
    const antiGhost = verifyGeneratedDocument(pleadingText);

    res.json({
      pleadingText,
      antiGhostVerification: antiGhost
    });
  } catch (err: any) {
    console.warn("[DefenseGeneratePleading] AI 降級至本機書狀產生庫:", err.message);
    const fallbackResult = buildFallbackDefensePleading(pleadingType, clientInput, caseInfo);
    res.json(fallbackResult);
  }
});

export default router;
