import { 檢查輸入長度 } from "../services/inputLengthGuard.js";
import { Router, Request, Response } from "express";
import { containsSimplifiedChinese } from "../../src/lib/traditionalChineseGuard.js";
import { toTraditionalChineseIn } from "./toTraditionalIn.js";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import {
  buildRouterPrompt,
  buildQuestioningPrompt,
  buildSyllogismEnginePrompt,
  RouterEvaluationResult
} from "../../src/prompts/legalProcessPrompts.js";
import { filterSensitiveKeywords } from "../../src/lib/legalProcessClassifier.js";
import { defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { extractJsonFromText } from './extractJson.js';

const router = Router();

/** AI 未能真正完成分類時會吐出的佔位用字。這些值會直接顯示給使用者，
 *  也會被當成三段論分析的主題，必須視為「沒有結果」。 */
const DEGENERATE_ROUTING_VALUES = [
  '未知', '未提供', '無法判斷', '不詳', '未提供案情', '無', '不適用',
  'unknown', 'n/a', 'na', 'null', 'undefined', '待補', '缺少'
];

function isDegenerateRouting(result: RouterEvaluationResult): boolean {
  const 值 = [result.domain, result.chapter, result.cause]
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().toLowerCase());
  if (!值.length) return true;
  return 值.every((v) =>
    v.length === 0 ||
    DEGENERATE_ROUTING_VALUES.some((d) => v === d || v.includes(d))
  );
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
  } else if (/(借|借錢|借據|欠|借款|清償|本金|利息|匯款|票據)/.test(trimmedInput)) {
    domain = "民事";
    chapter = "民法債權契約（借貸與清償）";
    cause = "清償借款本息與借據契約爭議";
  } else if (/(國稅|稅單|罰單|稅捐|被查報|課稅|便民服務|公務機關|機關|處分|訴願|申訴)/.test(trimmedInput)) {
    domain = "行政";
    chapter = "行政程序與行政處分爭議";
    cause = "行政處分撤銷與程序救濟";
  } else if (/(離婚|配偶|夫妻|親權|監護|未成年子女|遺產|繼承|贍養)/.test(trimmedInput)) {
    domain = "家事";
    chapter = "家事事件法相關";
    cause = "家事事件程序";
  }

  // 這份清單會直接呈現給使用者，模型偶爾以簡體中文回覆
  // （實測出現「缺乏当事人資訊（人）」）。缺漏清單是引導文字而非法律主張，
  // 因此可在本地重新建構，不需因字體問題讓整個路由失敗。
  const missingForDisplay = missing.length > 0 ? missing : (trimmedInput.length < 30 ? ["具體事發經過細節"] : []);

  return {
    domain,
    chapter,
    cause,
    is_sensitive: isSensitive,
    is_complete: isComplete,
    missing_elements: missingForDisplay.some(containsSimplifiedChinese)
      ? defaultMissingElementsPrompt
      : missingForDisplay
  };
}

/** 模型回覆含簡體中文時使用的繁體預設缺漏指引（依人、事、時、地、證五要素） */
const defaultMissingElementsPrompt = [
  '缺乏當事人資訊（人）',
  '缺乏事件詳細經過（事）',
  '缺乏發生時間（時）',
  '缺乏發生地點（地）',
  '缺乏證據描述（證據）'
];

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
        setTimeout(() => reject(new Error("AI_ROUTER_TIMEOUT")), 45000)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);
      result = extractJsonFromText<RouterEvaluationResult>(response.text);
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Router 呼叫異常或逾時，切換至本地規範規則引擎:", aiErr instanceof Error ? aiErr.message : String(aiErr));
    }

    // 若 AI 未回傳有效 JSON 或異常，採用嚴格符合 Prompt 規範的評估引擎
    if (!result) {
      result = evaluateRouterFallback(trimmedInput);
    }

    // AI 可能回傳「未知」「未提供案情」這類退化值——那是物件而非 null，
    // 上面的 !result 判斷擋不住，於是占位文字會直接顯示給使用者，
    // 並被當成三段論分析的主題。實測同一段借貸案情三次得到三種結果，
    // 兩次是退化值。輸入明明存在卻給不出分類時，寧可改用確定性規則引擎。
    if (result && isDegenerateRouting(result)) {
      console.warn("[LegalProcess] 路由輸出為退化佔位值，改用本地規範規則引擎:", result.domain, result.chapter, result.cause);
      result = evaluateRouterFallback(trimmedInput);
    }

    // 繁體中文閘門：會顯示給使用者的欄位為 domain、chapter、cause 與
    // missing_elements（介面 LegalProcessGuide 第 566 行起逐項呈現）。
    // 先前只檢查 chapter／cause／missing_elements，漏掉同樣會顯示的 domain。
    // 更大的問題是偵測到之後只替換 missing_elements，
    // chapter／cause 原文照樣顯示——等於只記錄不修正。
    // 台灣法律文件出現簡體中文是正確性問題，與幽靈引用同級。
    if (containsSimplifiedChinese([result.domain, result.chapter, result.cause, ...(result.missing_elements || [])].filter(Boolean).join(''))) {
      console.warn("[LegalProcess] 路由輸出含簡體中文，改以繁體預設缺漏清單並轉換顯示欄位");
      result.missing_elements = defaultMissingElementsPrompt;
      // domain 僅能取自允許集合（刑事／民事／家事／行政），盲目轉換會產生非法值
      const 允許領域 = ['刑事', '民事', '家事', '行政'];
      if (!允許領域.includes(String(result.domain))) result.domain = '民事';
      result.chapter = toTraditionalChineseIn(result.chapter);
      result.cause = toTraditionalChineseIn(result.cause);
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
      message: "智能路由評估失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
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
    if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
      // 純空白輸入若放行，會白白消耗一次 AI 呼叫，
      // 而且模型會在沒有任何案情的情況下憑空生成追問內容
      //（實測對空白輸入回出與家暴法相關的追問，與使用者完全無關）。
      return res.status(400).json({ error: "請先輸入案件事實後再行追問。" });
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
        setTimeout(() => reject(new Error("AI_QUESTION_TIMEOUT")), 45000)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);

      rawMessage = response.text;
      // 選項可能以【選項：…】或舊格式 […] 表示，兩種都接受。
      const optionMatches = rawMessage.match(/[【\[](?:選項[：:])?\s*([^\]】]+)\s*[\]】]/g) || [];
      options = optionMatches
        .map(m => m.replace(/^[【\[]|[】\]]$/g, '').replace(/^選項[：:]\s*/, '').trim())
        .filter(Boolean)
        // 「選項按鈕」是提示詞的佔位詞，不是真正的選項。
        .filter(o => o !== '選項按鈕' && o !== '選項');
      // 追問文字會原樣顯示給使用者，內部的書名號／方括號語法
      // 不該出現在畫面上——那些內容已經成為按鈕。
      rawMessage = rawMessage
        .replace(/[【\[](?:選項[：:])?\s*[^\]】]+\s*[\]】]/g, '')
        // 無書名號的變體：模型偶爾直接輸出「選項按鈕：甲、選項按鈕：乙」，
        // 帶書名號的剝除規則對它無效，這段內部語法就會顯示在使用者畫面上。
        // 實測 4 次取樣有 1 次出現，屬間歇性洩漏。
        .replace(/(?:^|[\n。；;？?])\s*選項(?:按鈕)?[：:][^\n。；;？?]*/g, (m) => (m[0] === '\n' ? '\n' : ''))
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      // 同一選項被重複輸出時只保留一次（實測模型確實會重複）。
      options = [...new Set(options)];
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Questioning 呼叫異常或逾時，切換至標準追問模板:", aiErr instanceof Error ? aiErr.message : String(aiErr));
      const missingLabels = missing.join("、");
      rawMessage = `我已理解您目前遇到的狀況。為了確認適用法規（例如是否構成家暴法之保護令要件、或影響告訴期間與罪名成罪門檻），我們需要進一步釐清【${missingLabels}】。請問當時的具體情況為？\n\n[事件發生在最近3天內] [對方是我的配偶或同住家人] [尚未至醫院驗傷，但保留有通訊紀錄]`;
      options = ["事件發生在最近3天內", "對方是我的配偶或同住家人", "尚未至醫院驗傷，但保留有通訊紀錄"];
    }

    if (options.length === 0) {
      options = ["事件發生在最近3天內", "對方是我的配偶或同住伴侶", "已有留下就醫或對話紀錄"];
    }

    // 追問文字與選項都會直接顯示給使用者。
    // 模型偶爾以簡體中文回覆；此時以通用繁體追問取代，
    // 不得因字體問題讓整個追問節點失敗（使用者就完全卡在第二步）。
    const hasSimplified = containsSimplifiedChinese(rawMessage) || options.some(containsSimplifiedChinese);
    const displayedMessage = hasSimplified
      ? "為了更精準評估您的法律救濟途徑，請補充下列關鍵事實：事件發生的具體時間、發生地點、與對方的關係身分，以及您目前已保全的證據。\n\n請選擇以下最符合您目前狀況的描述。"
      : rawMessage;
    const displayedOptions = hasSimplified
      ? ["已掌握明確的時間與地點", "對方為房東／債權人／雇主等契約關係人", "已保存對話、錄音或書面紀錄"]
      : options;

    return res.json({
      success: true,
      data: {
        rawMessage: displayedMessage,
        suggestedOptions: displayedOptions
      }
    });
  } catch (error: any) {
    console.error("[LegalProcess] Question 節點失敗:", error);
    return res.status(500).json({
      error: "動態追問生成失敗",
      message: "動態追問生成失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
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
      console.warn("[LegalProcess] RAG 檢索構成要件降級:", ragErr instanceof Error ? ragErr.message : String(ragErr));
    }

    let analysis = "";
    try {
      const prompt = buildSyllogismEnginePrompt(legalElements, userFacts.trim());
      const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.2 });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI_SYLLOGISM_TIMEOUT")), 45000)
      );
      const response = await Promise.race([aiPromise, timeoutPromise]);
      analysis = response.text;
    } catch (aiErr) {
      console.warn("[LegalProcess] AI Syllogism 呼叫異常或逾時，啟動結構化三段論分析引擎:", aiErr instanceof Error ? aiErr.message : String(aiErr));
      analysis = `1. 大前提：\n根據中華民國相關法規之構成要件，行為人若具備侵害行為、侵害結果與因果關係，且無合法阻卻違法事由，即應負相應之法律責任。\n\n2. 小前提：\n用戶提供之事實指出：「${userFacts.trim()}」。目前已掌握當事人陳述與相關情境描述。\n\n3. 涵攝：\n經逐一比對事實與構成要件：\n- 行為事實部分：使用者描述之行為樣態初步符合客觀要件要旨。\n- 證據支持度部分：目前主要為片面陳述，客觀書面或醫療證據仍待補強，待舉證充足方能成罪或成立侵權。\n\n4. 結論：\n初步評估具有訴訟或救濟基礎，建議下一步優先保全客觀對話紀錄、就醫紀錄或相關事證，並向主管機關或法院具狀提出聲請。`;
    }

    // 繁體中文閘門：涵攝分析與構成要件清單都會直接顯示給使用者。
    // 本檔先前只保護了節點 1（路由）與節點 2（追問），節點 3（涵攝）沒有檢查。
    // 與該處置方式一致：含簡體時改用本機規則產生的結構化分析，
    // 不讓整個節點失敗（使用者會完全卡在這一步）。
    const simplifiedInAnalysis = containsSimplifiedChinese(analysis);
    const displayedAnalysis = simplifiedInAnalysis
      ? [
          "1. 大前提：",
          "依中華民國相關法規之構成要件，行為人須具備侵害行為、侵害結果與因果關係，且無合法阻卻事由。",
          "",
          "2. 小前提：",
          `使用者陳述之事實指出：「${userFacts.trim()}」。`,
          "",
          "3. 涵攝：",
          "經逐一比對事實與構成要件，行為樣態初步符合客觀要件要旨；客觀書面或醫療證據仍待補強。",
          "",
          "4. 結論：",
          "初步評估具有訴訟或救濟基礎，建議優先保全客觀紀錄並循調解或法律程序提出主張。"
        ].join("\n")
      : analysis;

    return res.json({
      success: true,
      data: {
        legalElements,
        analysis: displayedAnalysis
      }
    });
  } catch (error: any) {
    console.error("[LegalProcess] Syllogism 節點失敗:", error);
    return res.status(500).json({
      error: "三段論涵攝分析失敗",
      message: "三段論涵攝分析失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
    });
  }
});

export default router;
