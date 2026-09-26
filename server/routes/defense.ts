import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { Router, Request, Response } from "express";
import { defaultAIProvider as configuredAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { getBPointTriagePrompt, getMineScanPrompt, getDefensePleadingPrompt } from "../../src/prompts/defense-workflow.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "../../src/utils/defenseFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { verifyGeneratedDocument, assertGeneratedDocumentVerified } from "../../src/lib/generatedDocumentPipeline.js";
import { defaultLegalGenerationPipeline, defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";

// Enforced centrally via defaultLegalGenerationPipeline

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

  const ragQuery = `${caseType || ""} ${litigationRole || ""} ${clientInput ? clientInput.slice(0, 100) : ""}`.trim() || "民刑事答辯實務";
  const legalContext = await defaultLegalRetrievalService.retrieveContext(ragQuery);

  const prompt = getBPointTriagePrompt(clientInput || "", caseType || "civil", litigationRole || "", courtName, caseNo);
  const fullPrompt = `${prompt}\n\n${legalContext.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await configuredAIProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallbackDefenseTriage(clientInput || "", caseType, courtName, caseNo);
    }
    parsed.legalSources = legalContext.sources;
    parsed.isExternalRetrievalUsed = legalContext.isExternalRetrievalUsed;
    parsed.retrievalStatusMessage = legalContext.statusMessage;
    res.json(parsed);
  } catch (err: any) {
    console.warn("[DefenseTriage] AI 降級至本機分析庫:", err.message);
    const fallback: any = buildFallbackDefenseTriage(clientInput || "", caseType, courtName, caseNo);
    fallback.legalSources = legalContext.sources;
    fallback.isExternalRetrievalUsed = legalContext.isExternalRetrievalUsed;
    fallback.retrievalStatusMessage = legalContext.statusMessage;
    res.json(fallback);
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

  const ragQuery = `${caseType || ""} ${clientInput ? clientInput.slice(0, 70) : ""} ${opponentClaims ? opponentClaims.slice(0, 70) : ""}`.trim() || "訴訟風險抗辯實務裁判";
  const legalContext = await defaultLegalRetrievalService.retrieveContext(ragQuery);

  const prompt = getMineScanPrompt(clientInput || "", opponentClaims || "", caseType || "civil");
  const fullPrompt = `${prompt}\n\n${legalContext.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await configuredAIProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallbackMineScan(clientInput || "");
    }
    parsed.legalSources = legalContext.sources;
    parsed.isExternalRetrievalUsed = legalContext.isExternalRetrievalUsed;
    parsed.retrievalStatusMessage = legalContext.statusMessage;
    res.json(parsed);
  } catch (err: any) {
    console.warn("[DefenseScanMines] AI 降級至本機地雷掃描庫:", err.message);
    const fallback: any = buildFallbackMineScan(clientInput || "");
    fallback.legalSources = legalContext.sources;
    fallback.isExternalRetrievalUsed = legalContext.isExternalRetrievalUsed;
    fallback.retrievalStatusMessage = legalContext.statusMessage;
    res.json(fallback);
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
  // 答辯狀屬法院書狀，交付前必須取得 P4–P9 Final Gate 的 READY 授權。
  // 目錄中尚未建立「答辯狀」經核准的書狀結構與 rule profile，因此這條路徑無法取得授權。
  // 這裡必須 fail-closed，但不得留下不可達的後續程式碼誤導維護者。
  return res.status(409).json({
    error: '答辯狀尚未開放正式產製：此類書狀尚未建立經核准的格式結構與合規規則，系統不會交付未經授權的法院書狀。',
    code: 'P9_FINAL_GATE_REQUIRED',
    detail: {
      reason: 'CANONICAL_STRUCTURE_NOT_APPROVED',
      guidance: '請改用「全方位實用法務工具箱」中已開放的書狀類型。',
      reference: 'src/lib/rules/courtPleadingRuleProfiles.ts'
    }
  });
});

export default router;
