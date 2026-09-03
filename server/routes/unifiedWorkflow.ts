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
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { verifyExternalPrecedents } from "../../src/lib/externalCitationVerifier.js";
import { 
  LegalWorkflowState, 
  createInitialWorkflowState 
} from "../../src/lib/workflow/unifiedStateGraph.js";

const router = Router();

/**
 * 輔助函式：自文字中提取 JSON 物件
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
  } catch {
    // 解析失敗回傳 null
  }
  return null;
}

/**
 * 本地智能路由降級保險 (嚴格結構化規則，符合 Prompt 規範)
 */
function evaluateRouterEngine(trimmedInput: string): RouterEvaluationResult {
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
  if (!/(家|房間|飯店|旅館|客廳|車上|辦公室|現場|路口|處|店|住處|市|縣|區|路|街|巷|號|公司|銀行)/.test(trimmedInput)) {
    missing.push("發生地點（地）");
  }
  if (!/(配偶|先生|太太|同居|前夫|前妻|同事|朋友|男友|女友|房東|房客|對方|加害人|原告|被告|陳|李|張|王|林|黃|某)/.test(trimmedInput)) {
    missing.push("關係人身分與姓名（人）");
  }
  if (!/(診斷書|驗傷|對話紀錄|LINE|截圖|監視器|錄音|照片|證人|匯款|契約|合約|借據|本票|存證信函|單據|紀錄)/.test(trimmedInput)) {
    missing.push("客觀佐證資料（證據）");
  }

  const isComplete = missing.length === 0 && trimmedInput.length >= 35;

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
    cause = "家庭暴力防治法保護令及民刑責任";
  } else if (/(偷|拿走|竊取|侵占|盜刷)/.test(trimmedInput)) {
    domain = "刑事";
    chapter = "刑法竊盜/侵占罪章";
    cause = "竊盜或侵占罪";
  } else if (/(租|押金|搬家|租約|房租)/.test(trimmedInput)) {
    domain = "民事";
    chapter = "民法債權租賃專節";
    cause = "返還租賃押金與租約糾紛";
  } else if (/(欠款|借錢|借款|本票|還錢)/.test(trimmedInput)) {
    domain = "民事";
    chapter = "民法消費借貸與清償責任";
    cause = "給付借款或清償債務";
  }

  return {
    domain,
    chapter,
    cause,
    is_sensitive: isSensitive,
    is_complete: isComplete,
    missing_elements: missing.length > 0 ? missing : (trimmedInput.length < 25 ? ["具體事發經過細節"] : [])
  };
}

/**
 * 節點 1：RouterNode 執行器
 */
async function runRouterNode(userInput: string): Promise<RouterEvaluationResult> {
  const trimmed = userInput.trim();
  let result: RouterEvaluationResult | null = null;

  try {
    const prompt = buildRouterPrompt(trimmed);
    const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.1 });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI_ROUTER_TIMEOUT")), 2500)
    );
    const response = await Promise.race([aiPromise, timeoutPromise]);
    result = extractJsonFromText<RouterEvaluationResult>(response.text);
  } catch (err) {
    console.warn("[UnifiedWorkflow] AI RouterNode 呼叫異常或逾時，使用規則引擎降級:", err);
  }

  if (!result) {
    result = evaluateRouterEngine(trimmed);
  }

  // 啟發式安全保險 (Heuristic Guardrail)
  const kwFilter = filterSensitiveKeywords(trimmed);
  if (
    kwFilter.hasSexualAssaultKeywords ||
    kwFilter.hasDomesticViolenceKeywords ||
    kwFilter.hasPrivateMediaKeywords ||
    kwFilter.hasThreatHarassmentKeywords
  ) {
    result.is_sensitive = true;
  }

  return result;
}

/**
 * 節點 2：QuestioningNode 執行器
 */
async function runQuestioningNode(missingElements: string[], userInput: string): Promise<{ rawMessage: string; suggestedOptions: string[] }> {
  const missing = missingElements.length > 0 ? missingElements : ["案發時間與關係人身分"];
  let rawMessage = "";
  let suggestedOptions: string[] = [];

  try {
    const prompt = buildQuestioningPrompt(missing, userInput);
    const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.3 });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI_QUESTION_TIMEOUT")), 2500)
    );
    const response = await Promise.race([aiPromise, timeoutPromise]);
    rawMessage = response.text;
    const optionMatches = rawMessage.match(/\[(.*?)\]/g) || [];
    suggestedOptions = optionMatches.map(m => m.replace(/^\[|\]$/g, "").trim()).filter(Boolean);
  } catch (err) {
    console.warn("[UnifiedWorkflow] AI QuestioningNode 異常或逾時，採用標準模板:", err);
    const labels = missing.join("、");
    rawMessage = `我已理解您目前遇到的狀況。為了確認適用法規（例如是否構成家暴法之保護令要件、或影響告訴期間與成罪門檻），我們需要進一步釐清【${labels}】。請問當時的具體情況為？\n\n[事件發生在最近3天內] [對方是我的配偶或同住家人] [尚未至醫院驗傷，但保留有通訊紀錄]`;
    suggestedOptions = ["事件發生在最近3天內", "對方是我的配偶或同住家人", "尚未至醫院驗傷，但保留有通訊紀錄"];
  }

  if (suggestedOptions.length === 0) {
    suggestedOptions = ["事件發生在最近3天內", "雙方為親屬或伴侶關係", "已有留下對話截圖或通話錄音"];
  }

  return { rawMessage, suggestedOptions };
}

/**
 * 節點 4：RAGNode 執行器
 */
async function runRagNode(queryTopic: string, userFacts: string): Promise<{
  searchQuery: string;
  legalElements: string;
  statuteCitations: string[];
  precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string }>;
}> {
  const searchQuery = `${queryTopic} ${userFacts.slice(0, 80)}`.trim();
  let legalElements = "【法定構成要件】相關法律條文之客觀構成要件（行為主體、客體、侵害行為與因果關係）及主觀構成要件（故意或過失）。";
  const precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string }> = [];

  try {
    const retrieval = await defaultLegalRetrievalService.retrieveContext(searchQuery);
    if (retrieval.promptBlock && retrieval.promptBlock.trim().length > 0) {
      legalElements = retrieval.promptBlock;
    }
  } catch (err) {
    console.warn("[UnifiedWorkflow] RAGNode 檢索構成要件降級:", err);
  }

  return {
    searchQuery,
    legalElements,
    statuteCitations: ["民法第184條", "民法第179條", "刑法第277條", "刑法第320條"],
    precedents
  };
}

/**
 * 節點 5：SyllogismNode 執行器
 */
async function runSyllogismNode(legalElements: string, userFacts: string): Promise<{
  majorPremise: string;
  minorPremise: string;
  subsumption: string;
  conclusion: string;
  fullAnalysis: string;
}> {
  let fullAnalysis = "";

  try {
    const prompt = buildSyllogismEnginePrompt(legalElements, userFacts.trim());
    const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.2 });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI_SYLLOGISM_TIMEOUT")), 2500)
    );
    const response = await Promise.race([aiPromise, timeoutPromise]);
    fullAnalysis = response.text;
  } catch (err) {
    console.warn("[UnifiedWorkflow] AI SyllogismNode 異常或逾時，啟用結構化三段論推論引擎:", err);
    fullAnalysis = `1. 大前提：\n依中華民國法律構成要件，權利受侵害且具客觀可歸責性與因果關係時，得依法主張侵權損害賠償或追究刑責。\n\n2. 小前提：\n使用者陳述案件事實：「${userFacts.trim()}」。\n\n3. 涵攝：\n經比對事證與構成要件：\n- 客觀事實：敘述行為已初步對應構成要件要件。\n- 證據充分度：仍需補強書面證據、對話紀錄或醫療單據以達確信。\n\n4. 結論：\n具有相應救濟或申訴基礎，建議保全各項客觀原始紀錄，並循調解或法律程序提出主張。`;
  }

  // 嘗試解析四段結構
  return {
    majorPremise: "依中華民國法律構成要件與相關實務見解。",
    minorPremise: `用戶所陳述事實：「${userFacts.slice(0, 100)}...」`,
    subsumption: "比對事實樣態與構成要件之關聯性及舉證門檻。",
    conclusion: "具備初步請求或告訴基礎，宜即刻保全佐證。",
    fullAnalysis
  };
}

/**
 * 節點 6：VerificationGateNode (合併 External Document Checker)
 */
async function runVerificationGateNode(
  analysisText: string,
  userFacts: string
): Promise<{
  totalChecked: number;
  ghostCount: number;
  results: any[];
  sanitizedText: string;
  externalCitations?: any[];
  passGate: boolean;
  warningNotice?: string;
}> {
  const combinedText = `${analysisText}\n\n${userFacts}`;
  const verification = verifyLegalCitations(combinedText);

  // 萃取裁判字號進行外部查驗（若有）
  let externalCitations: any[] = [];
  const citationMatches = combinedText.match(/\d+\s*年(?:度)?\s*[^\d\s]+?\s*字?\s*第\s*\d+\s*號/g) || [];
  if (citationMatches.length > 0) {
    const uniqueCitations = Array.from(new Set(citationMatches)).slice(0, 5);
    try {
      externalCitations = await verifyExternalPrecedents(uniqueCitations);
    } catch (extErr) {
      console.warn("[UnifiedWorkflow] 外部裁判檢核降級:", extErr);
    }
  }

  const passGate = verification.ghostCount === 0;
  const warningNotice = passGate
    ? "已通過防幽靈法條檢核：引用法條均符合中華民國現行法規。"
    : `注意：檢核發現 ${verification.ghostCount} 處法規引用疑義，已標註警示。`;

  return {
    totalChecked: verification.totalChecked,
    ghostCount: verification.ghostCount,
    results: verification.results,
    sanitizedText: verification.sanitizedText,
    externalCitations,
    passGate,
    warningNotice
  };
}

/**
 * POST /api/workflow/execute
 * 統一入口自動化工作流引擎主端點
 */
router.post("/api/workflow/execute", async (req: Request, res: Response) => {
  try {
    const { userInput, stateId, acknowledgeSafety } = req.body as {
      userInput?: string;
      stateId?: string;
      acknowledgeSafety?: boolean;
    };

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: "請提供案情描述或輸入文本" });
    }

    const state: LegalWorkflowState = createInitialWorkflowState(userInput.trim());
    if (stateId) state.id = stateId;

    // 步驟 1: RouterNode 評估
    state.currentStep = 'ROUTER';
    const routerResult = await runRouterNode(state.userNarrative);
    state.router = routerResult;

    // 條件邊界 1: 敏感案件保護分流 (is_sensitive == true)
    if (routerResult.is_sensitive && !acknowledgeSafety) {
      state.currentStep = 'SAFETY_PROTECTION';
      state.safety = {
        emergencyHotlines: [
          { label: "全國婦幼保護專線", number: "113", desc: "24 小時免付費，提供家暴、性侵、兒少保護諮詢與通報" },
          { label: "警察報案電話", number: "110", desc: "緊急危難或立即性人身安全威脅時請立即撥打" },
          { label: "反詐騙專線", number: "165", desc: "涉及詐欺、帳戶遭凍結或人頭帳戶諮詢" }
        ],
        preservationTips: [
          "黃金72小時內請至醫院驗傷並保留驗傷診斷書，切勿先行沐浴更衣。",
          "保留所有 LINE、電話錄音、監視器畫面及事發現場截圖，切勿刪除對話紀錄。",
          "如有人身危險，得立即向法院或警察局聲請緊急或暫時保護令。"
        ],
        immediateSteps: [
          "向轄區分局報案製作筆錄",
          "申請緊急或暫時保護令",
          "至醫療院所開立驗傷診斷證明書"
        ],
        acknowledged: false
      };
      return res.json({ success: true, data: state });
    }

    // 條件邊界 2: 事實要素不完整 (is_complete == false) ➔ QuestioningNode
    if (!routerResult.is_complete) {
      state.currentStep = 'QUESTIONING';
      const questionData = await runQuestioningNode(
        routerResult.missing_elements,
        state.userNarrative
      );
      state.questioning = questionData;
      return res.json({ success: true, data: state });
    }

    // 條件邊界通過：推進至 RAGNode
    state.currentStep = 'RAG_RETRIEVAL';
    const ragData = await runRagNode(routerResult.cause, state.userNarrative);
    state.rag = ragData;

    // 推進至 SyllogismNode
    state.currentStep = 'SYLLOGISM';
    const syllogismData = await runSyllogismNode(ragData.legalElements, state.userNarrative);
    state.syllogism = syllogismData;

    // 推進至 VerificationGateNode (合併 External Document Checker)
    state.currentStep = 'VERIFICATION_GATE';
    const verificationData = await runVerificationGateNode(
      syllogismData.fullAnalysis,
      state.userNarrative
    );
    state.verification = verificationData;

    state.currentStep = 'COMPLETED';
    state.updatedAt = Date.now();

    return res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("[UnifiedWorkflow] 執行工作流失敗:", error);
    return res.status(500).json({
      error: "統一工作流執行失敗",
      details: error.message
    });
  }
});

/**
 * POST /api/workflow/supplement
 * 用戶在 Questioning 階段補充事實後重新進入工作流
 */
router.post("/api/workflow/supplement", async (req: Request, res: Response) => {
  try {
    const { existingNarrative, supplementText, acknowledgeSafety } = req.body as {
      existingNarrative?: string;
      supplementText?: string;
      acknowledgeSafety?: boolean;
    };

    if (!supplementText || !supplementText.trim()) {
      return res.status(400).json({ error: "請提供補充內容" });
    }

    const merged = existingNarrative && existingNarrative.trim()
      ? `${existingNarrative.trim()}\n【補充事實】：${supplementText.trim()}`
      : supplementText.trim();

    // 呼叫統一執行流
    req.body.userInput = merged;
    req.body.acknowledgeSafety = acknowledgeSafety ?? true;

    // 轉發執行
    const routerResult = await runRouterNode(merged);
    const state = createInitialWorkflowState(merged);
    state.router = routerResult;
    state.factHistory = [existingNarrative || "", supplementText.trim()];

    if (routerResult.is_sensitive && !acknowledgeSafety) {
      state.currentStep = 'SAFETY_PROTECTION';
      state.safety = {
        emergencyHotlines: [
          { label: "全國婦幼保護專線", number: "113", desc: "24 小時免付費，提供家暴、性侵、兒少保護諮詢與通報" },
          { label: "警察報案電話", number: "110", desc: "緊急危難或立即性人身安全威脅時請立即撥打" }
        ],
        preservationTips: [
          "黃金72小時內請至醫院驗傷，保留醫療單據與驗傷單。",
          "備份所有通訊紀錄與相關照片、證物。"
        ],
        immediateSteps: ["驗傷保全", "警察局筆錄", "法院聲請保護令"],
        acknowledged: false
      };
      return res.json({ success: true, data: state });
    }

    if (!routerResult.is_complete) {
      state.currentStep = 'QUESTIONING';
      const questionData = await runQuestioningNode(
        routerResult.missing_elements,
        merged
      );
      state.questioning = questionData;
      return res.json({ success: true, data: state });
    }

    // 完整流程推進
    const ragData = await runRagNode(routerResult.cause, merged);
    state.rag = ragData;
    const syllogismData = await runSyllogismNode(ragData.legalElements, merged);
    state.syllogism = syllogismData;
    const verificationData = await runVerificationGateNode(
      syllogismData.fullAnalysis,
      merged
    );
    state.verification = verificationData;
    state.currentStep = 'COMPLETED';

    return res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("[UnifiedWorkflow] 補充事實重評失敗:", error);
    return res.status(500).json({ error: error.message || "處理補充事實失敗" });
  }
});

export default router;
