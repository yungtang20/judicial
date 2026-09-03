import { Router, Request, Response } from "express";
import { buildIntelligentRuleBasedTriage, enforceTriageConsistency } from "../../src/lib/universalTriage.js";
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

  const triagePrompt = `你是一位全領域精準法律診斷專家兼司法程序架構師。請根據當事人或委任人之案件敘述，以嚴謹的中華民國實務法理與程序法為基礎進行全能導診分流。

【核心原則：領域鎖定與防污染】
1. 一旦判定案件屬於「刑事/性自主/家暴」領域，嚴禁引用勞動法、商業法、公司法、稅法等無關領域法條。
2. 一旦判定案件屬於「勞動/商業」領域，嚴禁引用刑法性自主、家暴防治等無關領域法條。
3. 檢索結果必須與「identifiedIssue」高度相關，若檢索到不相關法條，必須在輸出中標註「檢索污染警告」並排除。

【敏感案件保護路徑（強制執行）】
若案件涉及性侵害、性騷擾、家庭暴力、跟蹤騷擾，必須在輸出頂部加入：
「⚠️ 敏感案件保護提醒：本案涉及性自主/家暴，請優先聯繫 113 保護專線。建議保留生物檢體、對話紀錄，並儘速就醫驗傷。以下分析僅供法律參考，不影響您尋求即時協助的權利。」

【分類與法理準則】
1. 涉及配偶或親屬間未經同意拿取財物、盜刷信用卡等行為，同時構成刑事犯罪（如刑法竊盜、偽造文書、詐欺）與民事侵權，請歸類為 CRIMINAL_COMPLAINT_THEFT，並依刑法第324條標示為刑事告訴乃論。不得僅歸類為純民事 CIVIL。
2. 乘機性交（刑法第225條）不論是否為配偶，絕對是非告訴乃論。性自主案件嚴禁引用物上請求權(民法767)。
3. 利用他人睡眠、酒醉、昏迷等不能抗拒狀態進行性行為，構成刑法第225條乘機性交罪，非告訴乃論。

【本系統已內建之訴訟工具庫（共 ${LEGAL_TOOLS.length} 項）】：
${toolsSummary}

【當事人案件事實敘述】：
"""${rawInput}"""
身分角色：${role || "未指定"}

請輸出標準 JSON 格式（勿包含 markdown 標籤或額外文字）：
{
  "isSensitive": true,
  "protectionNotice": "若 isSensitive 為 true，填入保護提醒文字；否則為空字串",
  "identifiedIssue": "具體的法律爭議或罪名標題",
  "category": "對應的工具類別或 ID",
  "recommendedToolId": "最適合的工具 ID",
  "caseType": "CIVIL",
  "isPublicProsecution": false,
  "legalBasis": ["僅限與本案高度相關之法條，例如：刑法第225條、民法第184條"],
  "isComplete": true,
  "missingElements": ["若 isComplete 為 false，列出缺失的關鍵事實，例如：有無驗傷、有無保存生物檢體、有無對話紀錄證明不願意"],
  "timeLimit": "具體時效，例如：公訴重罪無6個月限制、民事侵權2年",
  "litigationNatureText": "案件性質說明",
  "plainExplanation": "給當事人的白話文實體與程序法理分析（三段論法：前提、事實、結論）",
  "suggestedActions": ["第一步", "第二步"],
  "evidenceChecklist": ["證據1", "證據2"]
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
          payload = enforceTriageConsistency(JSON.parse(cleaned), rawInput);

          // 1. 敏感案件強制保護路徑
          if (payload.isSensitive) {
            if (!payload.protectionNotice || payload.protectionNotice.trim() === "") {
              payload.protectionNotice = "⚠️ 敏感案件保護提醒：本案涉及性自主/家暴，請優先聯繫 113 保護專線。建議保留生物檢體、對話紀錄，並儘速就醫驗傷。以下分析僅供法律參考，不影響您尋求即時協助的權利。";
            }
          }

          // 2. 動態追問機制
          if (payload.isComplete === false || (payload.missingElements && payload.missingElements.length > 0 && payload.isComplete !== true)) {
            payload.isComplete = false;
            payload.status = "need_more_info";
            payload.questions = payload.missingElements || [];
            payload.partialAnalysis = payload.plainExplanation || "";
            // 提供向後相容前端欄位
            payload.isSyllogismComplete = false;
            payload.missingQuestions = (payload.missingElements || []).map((q: string) => ({
              question: q,
              options: ["已具備佐證", "尚在蒐集", "不清楚/無"]
            }));
          } else {
            payload.isComplete = true;
            payload.status = "complete";
          }

          // 移除上帝節點 (pleadingDraft)，僅針對實體法理分析進行引述檢驗
          documentText = payload.plainExplanation || "本件無特殊法理說明";
        } catch {
          payload = buildIntelligentRuleBasedTriage(rawInput);
          documentText = payload?.plainExplanation || "本機規則安全檢核";
        }
        return { documentText, payload };
      },
      fallback: (retrieval, err) => {
        console.warn("[TriageUniversal] AI 降級至本機規則分流引擎:", err.message);
        const fallbackObj = buildIntelligentRuleBasedTriage(rawInput);
        return {
          documentText: fallbackObj.plainExplanation || "本機規則安全檢核",
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
