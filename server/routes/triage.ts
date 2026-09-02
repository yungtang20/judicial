import { Router, Request, Response } from "express";
import { buildIntelligentRuleBasedTriage } from "../../src/lib/universalTriage.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";
import { defaultLegalGenerationPipeline } from "../services/legalGenerationPipeline.js";

// Note: UNIVERSAL_SYLLOGISM_RULES and searchLegalSources are enforced centrally via defaultLegalGenerationPipeline

const router = Router();

router.post("/api/triage/universal", async (req: Request, res: Response) => {
  const { userNarrative, query, role } = req.body;
  const rawInput = userNarrative || query || "";
  if (!rawInput || typeof rawInput !== "string") {
    return res.status(400).json({ error: "請輸入案件敘述或法律諮詢問題" });
  }

  const precheck = precheckLegalInput(rawInput);
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const toolsSummary = LEGAL_TOOLS.map(t => `- [${t.id}] ${t.name}（${t.categoryLabel}）：${t.shortDesc}`).join("\n");

  const triagePrompt = `你是一位全領域精準法律診斷專家兼司法程序架構師。
請根據當事人或委任人之案件敘述，以嚴謹的中華民國實務法理與程序法為基礎進行全能導診分流。

【本系統已內建之訴訟工具庫（共 ${LEGAL_TOOLS.length} 項）】：
${toolsSummary}

【當事人案件事實敘述】：
"""
${rawInput}
"""
身分角色：${role || "未指定"}

請輸出標準 JSON 格式（勿包含 markdown 標籤或額外文字）：
{
  "identifiedIssue": "具體的法律爭議或罪名標題",
  "category": "對應的工具類別或 ID",
  "recommendedToolId": "最適合的工具 ID",
  "caseType": "CIVIL", // CIVIL, CRIMINAL_PUBLIC, 或 CRIMINAL_COMPLAINT_REQUIRED
  "isPublicProsecution": false, // 是否為公訴罪
  "legalBasis": ["民法第184條", "刑法第277條"], // 適用法條清單
  "timeLimit": "具體時效，例如：2年、6個月內",
  "litigationNatureText": "案件性質說明",
  "plainExplanation": "給當事人的白話文實體與程序法理分析（三段論法：前提、事實、結論）",
  "suggestedActions": ["第一步", "第二步"], // 具體行動建議
  "evidenceChecklist": ["證據1", "證據2"], // 需準備的證據清單
  "pleadingDraft": "若有初步訴狀或書狀草稿可放此"
}`;

  try {
    const pipelineResult = await defaultLegalGenerationPipeline.execute({
      ragQuery: rawInput,
      buildPrompt: () => triagePrompt,
      parseResponse: (rawText) => {
        let payload: any;
        let documentText = rawText;
        try {
          const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          payload = JSON.parse(cleaned);
          // Try stringifying a subset of textual content for citation verification to avoid breaking JSON structure
          // Triage relies heavily on JSON response, so we just run citation check on plainExplanation and pleadingDraft
          documentText = (payload.plainExplanation || "") + "\n\n" + (payload.pleadingDraft || "");
        } catch {
          payload = buildIntelligentRuleBasedTriage(rawInput);
          documentText = ""; // Bypass citation check for predefined rule engine
        }
        return { documentText, payload };
      },
      fallback: (retrieval, err) => {
        console.warn("[TriageUniversal] AI 降級至本機規則分流引擎:", err.message);
        const fallbackObj = buildIntelligentRuleBasedTriage(rawInput);
        return {
          documentText: "", // Bypass citation check for predefined rule engine
          payload: fallbackObj
        };
      },
      appendSyllogismRules: true
    });

    let finalPayload = pipelineResult.payload;
    
    // Attach RAG sources and status
    finalPayload.sources = pipelineResult.legalSources;
    finalPayload.isExternalRetrievalUsed = pipelineResult.isExternalRetrievalUsed;
    finalPayload.retrievalStatusMessage = pipelineResult.retrievalStatusMessage;
    finalPayload.allowedCitations = pipelineResult.allowedCitations;

    res.json(finalPayload);
  } catch (err: any) {
    console.error("[TriageUniversal] Pipeline execution error:", err.message);
    const fallbackObj: any = buildIntelligentRuleBasedTriage(rawInput);
    fallbackObj.error = "系統發生未預期錯誤，已自動降級至規則引擎。";
    res.json(fallbackObj);
  }
});

export default router;
