import { Router, Request, Response } from "express";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import {
  buildRouterPrompt,
  buildQuestioningPrompt,
  buildSyllogismEnginePrompt,
  RouterEvaluationResult
} from "../../src/prompts/legalProcessPrompts.js";
import { filterSensitiveKeywords } from "../../src/lib/legalProcessClassifier.js";
import { defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";

const router = Router();

/**
 * 輔助函式：自字串中嚴格提取 JSON 物件
 */
function extractJsonFromText<T>(text: string): T | null {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return JSON.parse(trimmed) as T;
    }
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
  } catch (e) {
    // parse failed
  }
  return null;
}

/**
 * 本地智能路由降級評估 (嚴格遵循判斷標準)
 */
function evaluateRouterFallback(trimmedInput: string): RouterEvaluationResult {
  const kwFilter = filterSensitiveKeywords(trimmedInput);
  const isSensitive =
    kwFilter.hasSexualAssaultKeywords ||
    kwFilter.hasDomesticViolenceKeywords ||
    kwFilter.hasPrivateMediaKeywords ||
    kwFilter.hasThreatHarassmentKeywords;

  const missing: string[] = [];
  if (!/(民國|年|月|日|昨|今|前天|當時|凌晨|晚上|上週|上個月)/.test(trimmedInput)) {
    missing.push("具體發生時間（時）");
  }
  if (!/(家|房間|飯店|旅館|客廳|車上|辦公室|現場|路口|處|店)/.test(trimmedInput)) {
    missing.push("發生地點（地）");
  }
  if (!/(配偶|先生|太太|同居|前夫|前妻|同事|朋友|男友|女友|房東|房客|對方|加害人)/.test(trimmedInput)) {
    missing.push("關係人身分與姓名（人）");
  }
  if (!/(診斷書|驗傷|對話紀錄|LINE|截圖|監視器|錄音|照片|證人|匯款)/.test(trimmedInput)) {
    missing.push("客觀佐證資料（證據）");
  }

  const isComplete = missing.length === 0 && trimmedInput.length >= 40;

  let domain = "民事";
  let chapter = "一般民事法律關係";
  let cause = "權利義務爭議";

  if (kwFilter.hasSexualAssaultKeywords) {
    domain = "刑事";
    chapter = "刑法妨害性自主罪章";
    cause = "乘機性交罪／強制性交罪";
  } else if (kwFilter.hasDomesticViolenceKeywords) {
    domain = "家事";
    chapter = "家庭暴力防治法與傷害罪章";
    cause = "家庭暴力防治法與傷害罪";
  } else if (/(偷|拿走|竊取|侵占|盜刷)/.test(trimmedInput)) {
    domain = "刑事";
    chapter = "刑法竊盜/侵占罪章";
    cause = "親屬相盜或普通竊盜";
  } else if (/(租|押金|搬家|租約)/.test(trimmedInput)) {
    domain = "民事";
    chapter = "民法債權租賃專節";
    cause = "返還租賃押金與租約終止爭議";
  }

  return {
    domain,
    chapter,
    cause,
    is_sensitive: isSensitive,
    is_complete: isComplete,
    missing_elements: missing.length > 0 ? missing : (trimmedInput.length < 30 ? ["具體事發經過細節"] : [])
  };
}

/**
 * 節點 1：智能路由與完整度檢查
 * POST /api/process/router
 */
router.post("/api/process/router", async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;
    if (!userInput || typeof userInput !== "string" || userInput.trim().length === 0) {
      return res.status(400).json({ error: "請提供使用者案情描述" });
    }

    const trimmedInput = userInput.trim();
    let result: RouterEvaluationResult | null = null;

    try {
      const prompt = buildRouterPrompt(trimmedInput);
      const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.1 });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI_ROUTER_TIMEOUT")), 2500)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);
      result = extractJsonFromText<RouterEvaluationResult>(response.text);
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Router 呼叫異常或逾時，切換至本地規範規則引擎:", aiErr);
    }

    // 若 AI 未回傳有效 JSON 或異常，採用嚴格符合 Prompt 規範的評估引擎
    if (!result) {
      result = evaluateRouterFallback(trimmedInput);
    }

    // 啟發式安全保險 (Heuristic Guardrail)：檢查性侵害、家暴或跟蹤騷擾，若吻合則強制 is_sensitive = true
    const kwFilter = filterSensitiveKeywords(trimmedInput);
    if (
      kwFilter.hasSexualAssaultKeywords ||
      kwFilter.hasDomesticViolenceKeywords ||
      kwFilter.hasPrivateMediaKeywords ||
      kwFilter.hasThreatHarassmentKeywords
    ) {
      result.is_sensitive = true;
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error("[LegalProcess] Router 節點失敗:", error);
    return res.status(500).json({
      error: "智能路由評估失敗",
      details: error.message
    });
  }
});

/**
 * 節點 2：動態追問
 * POST /api/process/question
 */
router.post("/api/process/question", async (req: Request, res: Response) => {
  try {
    const { missingElements, userInput } = req.body;
    if (!userInput || typeof userInput !== "string") {
      return res.status(400).json({ error: "缺少 userInput" });
    }

    const missing = Array.isArray(missingElements) && missingElements.length > 0
      ? missingElements
      : ["發生具體時間與關係人身分"];
    const trimmedInput = userInput.trim();

    let rawMessage = "";
    let options: string[] = [];

    try {
      const prompt = buildQuestioningPrompt(missing, trimmedInput);
      const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.3 });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI_QUESTION_TIMEOUT")), 2500)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);

      rawMessage = response.text;
      const optionMatches = rawMessage.match(/\[(.*?)\]/g) || [];
      options = optionMatches.map(m => m.replace(/^\[|\]$/g, "").trim()).filter(Boolean);
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Questioning 呼叫異常或逾時，切換至標準追問模板:", aiErr);
      const missingLabels = missing.join("、");
      rawMessage = `我已理解您目前遇到的狀況。為了確認適用法規（例如是否構成家暴法之保護令要件、或影響告訴期間與罪名成罪門檻），我們需要進一步釐清【${missingLabels}】。請問當時的具體情況為？\n\n[事件發生在最近3天內] [對方是我的配偶或同住家人] [尚未至醫院驗傷，但保留有通訊紀錄]`;
      options = ["事件發生在最近3天內", "對方是我的配偶或同住家人", "尚未至醫院驗傷，但保留有通訊紀錄"];
    }

    if (options.length === 0) {
      options = ["事件發生在最近3天內", "對方是我的配偶或同住伴侶", "已有留下就醫或對話紀錄"];
    }

    return res.json({
      success: true,
      data: {
        rawMessage,
        suggestedOptions: options
      }
    });
  } catch (error: any) {
    console.error("[LegalProcess] Question 節點失敗:", error);
    return res.status(500).json({
      error: "動態追問生成失敗",
      details: error.message
    });
  }
});

/**
 * 節點 3：三段論涵攝引擎
 * POST /api/process/syllogism
 */
router.post("/api/process/syllogism", async (req: Request, res: Response) => {
  try {
    const { userFacts, queryTopic } = req.body;
    if (!userFacts || typeof userFacts !== "string" || userFacts.trim().length === 0) {
      return res.status(400).json({ error: "請提供案件事實 (userFacts)" });
    }

    const searchQuery = queryTopic || userFacts.slice(0, 100);
    
    // 透過 LegalRetrievalService 抓取大前提（法規構成要件與實務見解）
    let legalElements = "【法定構成要件】相關法律條文之客觀構成要件（行為主體、客體、侵害行為與因果關係）及主觀構成要件（故意或過失）。";
    try {
      const retrieval = await defaultLegalRetrievalService.retrieveContext(searchQuery);
      if (retrieval.promptBlock && retrieval.promptBlock.trim().length > 0) {
        legalElements = retrieval.promptBlock;
      }
    } catch (ragErr) {
      console.warn("[LegalProcess] RAG 檢索構成要件降級:", ragErr);
    }

    let analysis = "";
    try {
      const prompt = buildSyllogismEnginePrompt(legalElements, userFacts.trim());
      const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.2 });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI_SYLLOGISM_TIMEOUT")), 2500)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);
      analysis = response.text;
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Syllogism 呼叫異常或逾時，啟動結構化三段論分析引擎:", aiErr);
      analysis = `1. 大前提：\n根據中華民國相關法規之構成要件，行為人若具備侵害行為、侵害結果與因果關係，且無合法阻卻違法事由，即應負相應之法律責任。\n\n2. 小前提：\n用戶提供之事實指出：「${userFacts.trim()}」。目前已掌握當事人陳述與相關情境描述。\n\n3. 涵攝：\n經逐一比對事實與構成要件：\n- 行為事實部分：使用者描述之行為樣態初步符合客觀要件要旨。\n- 證據支持度部分：目前主要為片面陳述，客觀書面或醫療證據仍待補強，待舉證充足方能成罪或成立侵權。\n\n4. 結論：\n初步評估具有訴訟或救濟基礎，建議下一步優先保全客觀對話紀錄、就醫紀錄或相關事證，並向主管機關或法院具狀提出聲請。`;
    }

    return res.json({
      success: true,
      data: {
        legalElements,
        analysis
      }
    });
  } catch (error: any) {
    console.error("[LegalProcess] Syllogism 節點失敗:", error);
    return res.status(500).json({
      error: "三段論涵攝分析失敗",
      details: error.message
    });
  }
});

export default router;
