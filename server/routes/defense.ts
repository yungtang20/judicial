import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { Router, Request, Response } from "express";
import { defaultAIProvider as defaultGeminiProvider } from "../../src/ai/providers/providerRegistry.js";
import { getBPointTriagePrompt, getMineScanPrompt } from "../../src/prompts/defense-workflow.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan } from "../../src/utils/defenseFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { executeCanonicalPleadingPipeline } from "../services/canonicalPleadingPipeline.js";

// Triage and mine scanning are analyses, not document-delivery endpoints.

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
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
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
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
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
  res.setHeader('Cache-Control', 'no-store');
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const caseInfo = body.caseInfo && typeof body.caseInfo === 'object' && !Array.isArray(body.caseInfo)
    ? body.caseInfo as Record<string, unknown>
    : {};
  if (caseInfo.caseType !== 'civil' || body.pleadingType !== 'LAWYER_PLEADING') {
    return res.status(422).json({
      error: '目前僅民事答辯狀具備核准的精確 Rule Profile；其他答辯或個人陳報類別維持阻擋。',
      code: 'P9_FINAL_GATE_REQUIRED'
    });
  }

  try {
    const result = await executeCanonicalPleadingPipeline('CIVIL_ANSWER', {
      ...body,
      courtName: caseInfo.courtName,
      proceeding: caseInfo.proceeding,
      plaintiffName: caseInfo.clientName,
      plaintiffAddress: caseInfo.clientAddress,
      defendantName: caseInfo.opponentName,
      defendantAddress: caseInfo.opponentAddress,
      litigationRepresentativeName: caseInfo.lawyerName,
      litigationRepresentativeAddress: caseInfo.lawyerAddress,
      claimStatement: body.answerDisposition,
      facts: body.clientInput,
      answerFactsAndReasons: body.answerFactsAndReasons || body.clientInput,
      opponentPosition: body.opponentPosition,
      evidenceList: body.evidenceList,
      attachments: body.attachments,
      documentaryEvidenceCopies: body.documentaryEvidenceCopies,
      directNotice: body.directNotice,
      documentDate: body.documentDate,
      signature: body.signature
    });
    return res.json({ ...result, pleadingText: result.documentText });
  } catch (error: any) {
    return res.status(422).json({
      error: error?.message || '民事答辯狀未通過 P4-P9 Final Gate。',
      code: error?.code || 'P9_FINAL_GATE_FAILED',
      ...(Array.isArray(error?.missingInputs) ? { missingInputs: error.missingInputs } : {})
    });
  }
});

export default router;
