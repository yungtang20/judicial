import { Router, Request, Response } from "express";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { 
  buildQuestioningPrompt, 
  buildSyllogismEnginePrompt,
  RouterEvaluationResult 
} from "../../src/prompts/legalProcessPrompts.js";
import { defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { retrieve } from "../services/legalRetrieval.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { verifyExternalPrecedents } from "../../src/lib/externalCitationVerifier.js";
import { 
  LegalWorkflowState, 
  createInitialWorkflowState 
} from "../../src/lib/workflow/unifiedStateGraph.js";
import { 
  buildIntelligentRuleBasedTriage, 
  enforceTriageConsistency,
  detectTemporalConflict 
} from "../../src/lib/universalTriage.js";
import { fetchFromOpenData } from "../services/judicialDataFetcher.js";
import { isWithinServiceHours } from "../services/judicialServiceHours.js";

const router = Router();

/**
 * 節點 1：RouterNode 執行器
 * 全面調用既有 universalTriage 法律分流與一致性校驗核心，消除雙軌分流差異
 */
async function runRouterNode(userInput: string): Promise<RouterEvaluationResult & {
  category?: string;
  caseType?: string;
  legalBasis?: string[];
  protectionNotice?: string;
  temporalConflict?: ReturnType<typeof detectTemporalConflict>;
}> {
  const trimmed = userInput.trim();

  // 1. 調用既有的智慧分流引擎
  const baseTriage = buildIntelligentRuleBasedTriage(trimmed);

  // 2. 透過 Layer 2 一致性校驗引擎進行防污染、時間矛盾檢查與敏感保護注入
  const triage = enforceTriageConsistency(baseTriage, trimmed);

  // 3. 時間矛盾偵測
  const temporal = detectTemporalConflict(trimmed);
  let isComplete = triage.isComplete !== false && !temporal.hasConflict;
  const missingElements = [...(triage.missingElements || [])];

  if (temporal.hasConflict && temporal.questionPrompt) {
    isComplete = false;
    if (!missingElements.some(m => m.includes("時間矛盾"))) {
      missingElements.unshift(`【時間矛盾】${temporal.questionPrompt}`);
    }
  }

  // 映射領域與案由標籤
  let domain = "民事";
  if (triage.caseType?.startsWith("CRIMINAL") || triage.isSensitive) {
    domain = "刑事";
  } else if (triage.category?.includes("DOMESTIC") || triage.category?.includes("DIVORCE")) {
    domain = "家事";
  } else if (triage.category?.includes("LABOR")) {
    domain = "勞動";
  }

  return {
    domain,
    chapter: triage.category || "法律爭議實體法章",
    cause: triage.identifiedIssue || "法律爭議請求權與程序分析",
    category: triage.category,
    caseType: triage.caseType,
    legalBasis: triage.legalBasis || [],
    is_sensitive: Boolean(triage.isSensitive),
    protectionNotice: triage.protectionNotice || "",
    is_complete: isComplete,
    missing_elements: missingElements,
    temporalConflict: temporal
  };
}

/**
 * 節點 2：QuestioningNode 執行器
 */
async function runQuestioningNode(
  missingElements: string[], 
  userInput: string,
  temporalConflict?: ReturnType<typeof detectTemporalConflict>
): Promise<{ rawMessage: string; suggestedOptions: string[] }> {
  // 若有時間矛盾，優先生成具體矛盾澄清追問
  if (temporalConflict?.hasConflict && temporalConflict.questionPrompt) {
    const rawMessage = `【案件事實矛盾澄清】系統在比對您的案情時發現時間陳述有邏輯矛盾：\n${temporalConflict.conflictDetail}\n\n👉 ${temporalConflict.questionPrompt}\n\n請協助確認正確的發生時間，避免因時間錯誤導致告訴期間或民事時效起算產生重大誤差。`;
    const suggestedOptions = [
      `確認為：${temporalConflict.explicitDate}`,
      `確認為：${temporalConflict.relativeDate}`,
      "兩者皆為誤記，我重新輸入具體日期"
    ];
    return { rawMessage, suggestedOptions };
  }

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
 * 節點 4：RAGNode 執行器（動態檢索條文與領域過濾，嚴禁無關條文污染與硬編碼）
 */
async function runRagNode(
  queryTopic: string, 
  userFacts: string,
  triageMeta: { caseType?: string; category?: string; isSensitive?: boolean; legalBasis?: string[] }
): Promise<{
  searchQuery: string;
  legalElements: string;
  statuteCitations: string[];
  precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string }>;
}> {
  const searchQuery = `${queryTopic} ${userFacts.slice(0, 80)}`.trim();
  let legalElements = "【法定構成要件】相關法律條文之客觀構成要件（行為主體、客體、侵害行為與因果關係）及主觀構成要件（故意或過失）。";
  const precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string }> = [];

  // 動態法規檢索：結合領域過濾
  const dynamicStatuteSet = new Set<string>();

  // 1. 加入 triage 已精準判定的專屬法條
  if (triageMeta.legalBasis && Array.isArray(triageMeta.legalBasis)) {
    triageMeta.legalBasis.forEach(b => {
      const match = b.match(/([\u4e00-\u9fa5]+法第\d+(?:之\d+)?條(?:第\d+項)?)/);
      if (match) dynamicStatuteSet.add(match[1]);
      else dynamicStatuteSet.add(b.split("（")[0].trim());
    });
  }

  // 2. 透過領域過濾的向量檢索取得法條與判決
  try {
    const chunks = await retrieve(searchQuery, {
      topK: 5,
      caseType: triageMeta.caseType,
      category: triageMeta.category,
      isSensitive: triageMeta.isSensitive
    });

    for (const chunk of chunks) {
      if (chunk.source === "statute" && chunk.citation) {
        dynamicStatuteSet.add(chunk.citation);
      } else if (chunk.source === "judgment") {
        precedents.push({
          caseNumber: chunk.citation,
          courtName: "最高法院/高等法院",
          summary: chunk.excerpt,
          sourceUrl: chunk.sourceUrl
        });
      }
    }
  } catch (ragErr) {
    console.warn("[UnifiedWorkflow] 動態條文檢索降級:", ragErr);
  }

  try {
    const retrieval = await defaultLegalRetrievalService.retrieveContext(searchQuery);
    if (retrieval.promptBlock && retrieval.promptBlock.trim().length > 0) {
      legalElements = retrieval.promptBlock;
    }
  } catch (err) {
    console.warn("[UnifiedWorkflow] RAGNode 檢索失敗:", err);
  }

  // Tier 3 fallback: Try Judicial OpenData if no precedents found locally
  if (precedents.length === 0) {
    try {
      const hoursCheck = isWithinServiceHours();
      if (hoursCheck.withinHours) {
        // Extract case ID from query or use queryTopic as case reference
        const opendataResult = await fetchFromOpenData(searchQuery, { timeoutMs: 5000 });
        if (opendataResult.success && opendataResult.html) {
          // Extract first 500 chars of main legal content as summary
          const summaryMatch = opendataResult.html.match(/主文[\s\S]{0,50}/) ||
                               opendataResult.html.match(/理由[\s\S]{0,50}/);
          if (summaryMatch) {
            precedents.push({
              caseNumber: searchQuery.slice(0, 30),
              courtName: "司法院/地方法院",
              summary: summaryMatch[0].replace(/<[^>]+>/g, "").slice(0, 200),
              sourceUrl: undefined
            });
            console.log("[UnifiedWorkflow] OpenData fallback succeeded for query:", searchQuery.slice(0, 30));
          }
        }
      } else {
        console.log("[UnifiedWorkflow] OpenData fallback skipped — outside service hours");
      }
    } catch (odErr) {
      console.warn("[UnifiedWorkflow] OpenData fallback failed:", odErr);
    }
  }

  const statuteCitations = Array.from(dynamicStatuteSet).filter(Boolean);

  return {
    searchQuery,
    legalElements,
    statuteCitations: statuteCitations.length > 0 ? statuteCitations : (triageMeta.legalBasis || ["現行相關實體法規"]),
    precedents
  };
}

/**
 * 節點 5：SyllogismNode 執行器（含敏感案件強制專屬檢討條文，嚴禁泛用侵權起手）
 */
async function runSyllogismNode(
  legalElements: string, 
  userFacts: string,
  routerMeta: { is_sensitive?: boolean; category?: string; protectionNotice?: string; legalBasis?: string[] }
): Promise<{
  majorPremise: string;
  minorPremise: string;
  subsumption: string;
  conclusion: string;
  fullAnalysis: string;
}> {
  let fullAnalysis = "";
  const isSexualOrDomestic = routerMeta.is_sensitive || 
    routerMeta.category?.includes("SEXUAL") || 
    routerMeta.category?.includes("DOMESTIC");

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
    
    // 若為性侵害或家暴，嚴禁使用泛用侵權起手
    if (isSexualOrDomestic) {
      fullAnalysis = `1. 大前提（妨害性自主與家暴防治專屬法條）：\n依刑法第221條（強制性交罪）、第225條（乘機性交猥褻罪）或家庭暴力防治法第2條、第14條，違背他人意願或利用不能抗拒狀態為性行為或實施身體騷擾威脅者，依法構成刑事重罪並得核發民事保護令。\n\n2. 小前提：\n使用者陳述事實：「${userFacts.trim()}」。\n\n3. 涵攝：\n- 行為人違背被害人意願或利用被害人意識不能抗拒之際為之，符合刑法妨害性自主罪章客觀構成要件。\n- 雙方具配偶或親密伴侶關係者，另該當家庭暴力防治法要件，得同步聲請保護令禁止施暴騷擾。\n\n4. 結論：\n本案涉及公訴刑事罪責與保護令聲請，應立即保全生物檢體與就醫驗傷，並得向地檢署具狀提出刑事告訴及向管轄地院聲請民事通常保護令。`;
    } else {
      const basisText = (routerMeta.legalBasis && routerMeta.legalBasis.length > 0)
        ? routerMeta.legalBasis.slice(0, 3).join("、")
        : "民法第184條等相關實體法規";
      fullAnalysis = `1. 大前提：\n依中華民國法律構成要件（如${basisText}），權利受侵害且具客觀可歸責性與因果關係時，得依法主張侵權損害賠償或追究法律責任。\n\n2. 小前提：\n使用者陳述案件事實：「${userFacts.trim()}」。\n\n3. 涵攝：\n經比對事證與法定構成要件：\n- 客觀事實：敘述行為已初步對應相關請求權要件。\n- 證據充分度：宜備妥書面合約、金流明細、通訊軟體截圖以達舉證門檻。\n\n4. 結論：\n具有相應救濟或申訴基礎，建議保全客觀原始紀錄，並循調解或法律程序提出主張。`;
    }
  }

  // 敏感案件強制在輸出頂部注入完整保護指引
  if (routerMeta.is_sensitive && routerMeta.protectionNotice) {
    if (!fullAnalysis.includes("113")) {
      fullAnalysis = `${routerMeta.protectionNotice}\n\n--------------------------------\n${fullAnalysis}`;
    }
  }

  return {
    majorPremise: isSexualOrDomestic ? "刑法第221條、第225條及家庭暴力防治法" : "依中華民國法律構成要件與實務見解",
    minorPremise: `用戶陳述事實：「${userFacts.slice(0, 100)}...」`,
    subsumption: "比對事實樣態與法定構成要件之關聯性及舉證門檻",
    conclusion: "具備初步法律主張與救濟程序基礎，應保全關鍵佐證",
    fullAnalysis
  };
}

/**
 * 節點 6：VerificationGateNode (防假通過改造)
 */
async function runVerificationGateNode(
  analysisText: string,
  userFacts: string,
  legalBasis: string[]
): Promise<{
  totalChecked: number;
  ghostCount: number;
  results: any[];
  sanitizedText: string;
  externalCitations?: any[];
  passGate: boolean;
  verificationStatus: "PASS" | "NEEDS_REVIEW" | "FAIL";
  warningNotice?: string;
}> {
  const combinedText = `${analysisText}\n\n${userFacts}\n\n${legalBasis.join(" ")}`;
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

  // 指令 3 核心防假通過校驗：
  // 1. 若法律分析結果中沒有具體法條引用（legalBasis 為空或未包含任何法條），必須判定為 NEEDS_REVIEW，不得判定為 PASS
  // 2. ghostCount == 0 僅代表沒有發現幽靈法條，不代表分析正確。驗證閘門必須同時檢查「有無具體法源引用」
  // 3. 若 totalChecked == 0，應視為「未執行有效檢核」，必須標記為 NEEDS_REVIEW
  const hasLegalBasis = Array.isArray(legalBasis) && legalBasis.length > 0 && legalBasis.some(b => /(條|項|款|法)/.test(b));

  let passGate = false;
  let verificationStatus: "PASS" | "NEEDS_REVIEW" | "FAIL" = "NEEDS_REVIEW";
  let warningNotice = "";

  if (verification.ghostCount > 0) {
    passGate = false;
    verificationStatus = "FAIL";
    warningNotice = `檢核發現 ${verification.ghostCount} 處不存在或疑義之幽靈法條，必須修正。`;
  } else if (verification.totalChecked === 0 || !hasLegalBasis) {
    passGate = false;
    verificationStatus = "NEEDS_REVIEW";
    warningNotice = "注意：分析中缺乏具體有效之實體法條引用（未執行有效條文檢核），已標註為待人工審查（NEEDS_REVIEW）。";
  } else {
    passGate = true;
    verificationStatus = "PASS";
    warningNotice = `已通過防幽靈法條與法源有效性檢核（共查核 ${verification.totalChecked} 處法規，均屬現行法規）。`;
  }

  return {
    totalChecked: verification.totalChecked,
    ghostCount: verification.ghostCount,
    results: verification.results,
    sanitizedText: verification.sanitizedText,
    externalCitations,
    passGate,
    verificationStatus,
    warningNotice
  };
}

/**
 * POST /api/workflow/execute
 * 統一入口自動化工作流主端點
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

    // 步驟 1: RouterNode 評估（全面調用 universalTriage）
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
          { label: "衛福部安心專線", number: "1925", desc: "24 小時心理諮商與心理支持熱線" }
        ],
        preservationTips: [
          "【生物檢體保全】：性自主案件切勿沐浴更衣，請立即將案發衣物以乾淨紙袋保全存證。",
          "【醫療驗傷】：黃金72小時內請至醫院急診驗傷，請醫師開立驗傷診斷書並保存生物檢體。",
          "【數位事證】：保留所有 LINE、通話錄音、監視器畫面及事發現場截圖，切勿刪除對話紀錄。",
          "【法律與心理支援】：如有人身危險，得立即向法院或警察局聲請緊急或暫時保護令，並可尋求心理諮商資源。"
        ],
        immediateSteps: [
          "撥打 113 保護專線或 110 報案",
          "至醫療院所開立驗傷診斷證明書並採證",
          "向轄區分局報案製作筆錄並聲請保護令"
        ],
        acknowledged: false
      };
      return res.json({ success: true, data: state });
    }

    // 條件邊界 2: 事實要素不完整或有時間矛盾 (is_complete == false) ➔ 必須中斷工作流，返回追問請求
    if (!routerResult.is_complete) {
      state.currentStep = 'QUESTIONING';
      const questionData = await runQuestioningNode(
        routerResult.missing_elements,
        state.userNarrative,
        routerResult.temporalConflict
      );
      state.questioning = questionData;
      // 嚴格終止，不得繼續執行後續節點
      return res.json({ success: true, data: state });
    }

    // 條件邊界通過：推進至 RAGNode
    state.currentStep = 'RAG_RETRIEVAL';
    const ragData = await runRagNode(routerResult.cause, state.userNarrative, {
      caseType: routerResult.caseType,
      category: routerResult.category,
      isSensitive: routerResult.is_sensitive,
      legalBasis: routerResult.legalBasis
    });
    state.rag = ragData;

    // 推進至 SyllogismNode
    state.currentStep = 'SYLLOGISM';
    const syllogismData = await runSyllogismNode(ragData.legalElements, state.userNarrative, {
      is_sensitive: routerResult.is_sensitive,
      category: routerResult.category,
      protectionNotice: routerResult.protectionNotice,
      legalBasis: routerResult.legalBasis
    });
    state.syllogism = syllogismData;

    // 推進至 VerificationGateNode (防假通過驗證)
    state.currentStep = 'VERIFICATION_GATE';
    const verificationData = await runVerificationGateNode(
      syllogismData.fullAnalysis,
      state.userNarrative,
      routerResult.legalBasis || []
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

    // 轉發執行統一 Router
    const routerResult = await runRouterNode(merged);
    const state = createInitialWorkflowState(merged);
    state.router = routerResult;
    state.factHistory = [existingNarrative || "", supplementText.trim()];

    if (routerResult.is_sensitive && !acknowledgeSafety) {
      state.currentStep = 'SAFETY_PROTECTION';
      state.safety = {
        emergencyHotlines: [
          { label: "全國婦幼保護專線", number: "113", desc: "24 小時免付費，提供家暴、性侵、兒少保護諮詢與通報" },
          { label: "警察報案電話", number: "110", desc: "緊急危難或立即性人身安全威脅時請立即撥打" },
          { label: "衛福部安心專線", number: "1925", desc: "24 小時心理諮商與心理支持熱線" }
        ],
        preservationTips: [
          "黃金72小時內請至醫院驗傷，保留醫療單據與驗傷單，切勿沐浴更衣。",
          "備份所有通訊紀錄與相關照片、證物。"
        ],
        immediateSteps: ["驗傷保全", "警察局筆錄", "法院聲請保護令"],
        acknowledged: false
      };
      return res.json({ success: true, data: state });
    }

    // 若仍不完整或仍存在時間矛盾，繼續中斷工作流
    if (!routerResult.is_complete) {
      state.currentStep = 'QUESTIONING';
      const questionData = await runQuestioningNode(
        routerResult.missing_elements,
        merged,
        routerResult.temporalConflict
      );
      state.questioning = questionData;
      return res.json({ success: true, data: state });
    }

    // 完整流程推進
    state.currentStep = 'RAG_RETRIEVAL';
    const ragData = await runRagNode(routerResult.cause, merged, {
      caseType: routerResult.caseType,
      category: routerResult.category,
      isSensitive: routerResult.is_sensitive,
      legalBasis: routerResult.legalBasis
    });
    state.rag = ragData;

    state.currentStep = 'SYLLOGISM';
    const syllogismData = await runSyllogismNode(ragData.legalElements, merged, {
      is_sensitive: routerResult.is_sensitive,
      category: routerResult.category,
      protectionNotice: routerResult.protectionNotice,
      legalBasis: routerResult.legalBasis
    });
    state.syllogism = syllogismData;

    state.currentStep = 'VERIFICATION_GATE';
    const verificationData = await runVerificationGateNode(
      syllogismData.fullAnalysis,
      merged,
      routerResult.legalBasis || []
    );
    state.verification = verificationData;

    state.currentStep = 'COMPLETED';
    state.updatedAt = Date.now();

    return res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("[UnifiedWorkflow] 補充事實重評失敗:", error);
    return res.status(500).json({ error: error.message || "處理補充事實失敗" });
  }
});

export default router;
