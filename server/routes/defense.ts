import { 檢查輸入長度 } from "../services/inputLengthGuard.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { containsSimplifiedChinese } from "../../src/lib/traditionalChineseGuard.js";
import { describePrecheckRejection } from "../../src/lib/precheckRejectionMessage.js";
import { Router, Request, Response } from "express";
import { defaultAIProvider as configuredAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { getBPointTriagePrompt, getMineScanPrompt, getDefensePleadingPrompt } from "../../src/prompts/defense-workflow.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "../../src/utils/defenseFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { officialPrecheckOptions } from "../services/statuteExistenceProvider.js";
import { defaultLegalGenerationPipeline, defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { extractJsonFromText } from './extractJson.js';
import { toTraditionalChineseIn } from './toTraditionalIn.js';

// Enforced centrally via defaultLegalGenerationPipeline

const router = Router();

// 1. Triage
router.post("/api/defense/triage", async (req: Request, res: Response) => {
  const { clientInput, litigationRole, caseType, courtName, caseNo } = req.body;

  const 長度 = 檢查輸入長度(clientInput, 'narrative');
  if (!長度.通過) {
    return res.status(413).json({ code: "INPUT_TOO_LONG", error: 長度.訊息 });
  }
  const precheck = precheckLegalInput(clientInput || "", 'analysis', officialPrecheckOptions());
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: describePrecheckRejection(precheck),
      issues: precheck.issues
    });
  }

  const ragQuery = `${caseType || ""} ${litigationRole || ""} ${clientInput ? clientInput.slice(0, 100) : ""}`.trim() || "民刑事答辯實務";
  const legalContext = await defaultLegalRetrievalService.retrieveContext(ragQuery);

  const prompt = getBPointTriagePrompt(clientInput || "", caseType || "civil", litigationRole || "", courtName, caseNo);
  const fullPrompt = `${prompt}\n\n${legalContext.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    // 提示詞要求「嚴格輸出標準 JSON」，但未告知供應商需要 JSON 模式。
    // 實測 defense-triage 幾乎每次都靜默降級成 32 字的規則輸出，
    // 而同樣呼叫 AI 的 agent-chat / triage-universal 都正常——差別就在這裡。
    // 供應商支援 response_format: json_object，與提示詞的宣告一致，
    // 模型就不會夾帶說明文字或 markdown 導致解析失敗。
    // 平台請求逾時防線。
    //
    // 實測正式站 defense/triage 的回應時間 p50 為 26.9 秒、max 30.8 秒，
    // 與 502 的出現時點（30 秒附近）重疊——那是 Render 代理的請求逾時，
    // 不是應用程式的錯誤（應用若出錯會回 500）。
    //
    // 應用雖設定 AGNES_TIMEOUT_MS=60000，但永遠輪不到它生效：
    // 平台會先切斷連線，使用者只看到 502，完全拿不到內容。
    //
    // 因此在平台上限之前主動降級：逾時就走本機規則分析，
    // 使用者至少拿到可用的分析與證據清單。
    // 25 秒留有餘裕，可在正常情況（多數 19~29 秒）完成真實 AI 分析。
    const 平台安全邊際 = Number(process.env.DEFENSE_AI_BUDGET_MS) || 25_000;
    const 逾時 = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DEFENSE_AI_BUDGET_EXCEEDED')), 平台安全邊際)
    );
    const aiRes = await Promise.race([
      configuredAIProvider.generate(fullPrompt, { responseMimeType: 'application/json' }),
      逾時
    ]);
    // 寬容擷取：模型可能在 JSON 前後加上說明文字，
    // 直接對整段回應做 JSON.parse 會失敗而靜默降級。
    // 實測未做寬容擷取時 3 次呼叫有 2 次降級。
    const parsedFromAI = extractJsonFromText<any>(aiRes.text);
    let parsed: any;

    if (parsedFromAI) {
      // 繁體中文閘門。
      //
      // AI 產出通常只夾帶少量簡體字（例如「担保」而非「擔保」），
      // 其餘是完整可用的法律分析。先前因為幾個字就整份丟棄、
      // 退回規則備援，使用者拿到 41 字的通用輸出，
      // 等於把可修正的小瑕疵升級成「AI 完全沒用上」的結果。
      //
      // 正確做法是先轉換為繁體；轉換後仍有殘留才 fail-closed，
      // 因為那代表對照表未涵蓋的字，不能保證轉換正確。
      const 已轉換 = toTraditionalChineseIn(parsedFromAI);
      if (containsSimplifiedChinese(JSON.stringify(已轉換))) {
        console.warn("[Defense] 轉換後仍含簡體中文，改用本機規則產生的結果");
        parsed = buildFallbackDefenseTriage(clientInput || "", caseType, courtName, caseNo);
      } else {
        parsed = 已轉換;
      }
    } else {
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
  // 前端送的是 caseBackground（見 apiClient.defenseScanMines），
  // 但端點原本只讀 opponentClaims，導致對手陳述從未進入掃描邏輯——
  // 而「自認地雷掃描」的核心正是比對當事人陳述與對手主張。
  // 兩個名稱都接受，以 opponentClaims 優先（語意較明確）。
  const { clientInput, opponentClaims, caseType, caseBackground, litigationRole } = req.body;
  const 對手陳述 = opponentClaims ?? caseBackground;

  const precheck = precheckLegalInput(`${clientInput || ''} ${對手陳述 || ''}`, 'analysis', officialPrecheckOptions());
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: describePrecheckRejection(precheck),
      issues: precheck.issues
    });
  }

  const ragQuery = `${caseType || ""} ${clientInput ? clientInput.slice(0, 70) : ""} ${對手陳述 ? String(對手陳述).slice(0, 70) : ""}`.trim() || "訴訟風險抗辯實務裁判";
  const legalContext = await defaultLegalRetrievalService.retrieveContext(ragQuery);

  // 參數順序為 (當事人陳述, 案件類型, 對手陳述)。
  // 先前誤傳成 (陳述, 對手陳述, 案件類型)，
  // 等於讓 AI 把對手主張當成案件類型、案件類型當成背景資料。
  const prompt = getMineScanPrompt(clientInput || "", caseType || "civil", String(對手陳述 || ""));
  const fullPrompt = `${prompt}\n\n${legalContext.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    // 與上方同理：提示詞要求 JSON 輸出，須一併告知供應商。
    const aiRes = await configuredAIProvider.generate(fullPrompt, { responseMimeType: 'application/json' });
    const parsedFromAI = extractJsonFromText<any>(aiRes.text);
    let parsed: any;
    if (parsedFromAI) {
      // 與 defense-triage 同理：先轉換，轉不掉的才 fail-closed。
      const 已轉換 = toTraditionalChineseIn(parsedFromAI);
      if (containsSimplifiedChinese(JSON.stringify(已轉換))) {
        console.warn("[Defense] 地雷掃描轉換後仍含簡體中文，改用本機規則產生的結果");
        parsed = buildFallbackMineScan(clientInput || "");
      } else {
        parsed = 已轉換;
      }
    } else {
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
  // 只解構實際會用到的欄位。其餘（triageData、mineData、caseInfo 等）
  // 先前帶有捏造的預設值（案號「113年度訴字第1234號」、法院名、當事人姓名），
  // 雖因本路徑恆回 409 而未流入輸出，但留下帶假資料的預設值
  // 等於在法律工具中埋下日後恢復此路徑時會直接產出假事實的陷阱。
  const { clientInput = "" } = req.body;

  const 長度 = 檢查輸入長度(clientInput, 'narrative');
  if (!長度.通過) {
    return res.status(413).json({ code: "INPUT_TOO_LONG", error: 長度.訊息 });
  }
  const precheck = precheckLegalInput(clientInput, "generation", officialPrecheckOptions());
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: describePrecheckRejection(precheck),
      issues: precheck.issues
    });
  }
  // 答辯狀屬法院書狀，交付前必須取得 P4–P9 Final Gate 的 READY 授權。
  // 目錄中尚未建立「答辯狀」經核准的書狀結構與 rule profile，因此這條路徑無法取得授權。
  // 這裡必須 fail-closed，但不得留下不可達的後續程式碼誤導維護者。
  return res.status(409).json({
    error: '答辯狀尚未開放正式產製：系統不會交付未經核准的法院書狀，因為結構或引用有誤的文件反而會讓你在法院站不住腳。',
    code: 'P9_FINAL_GATE_REQUIRED',
    detail: {
      reason: 'CANONICAL_STRUCTURE_NOT_APPROVED',
      guidance: '你的答辯權不受影響，也不會因系統未開放而失效。以下是可以立刻採取的步驟：'
        + '一、向承辦法院索取答辯狀空白範本（法院各股室與民事服務處均可提供）。'
        + '二、答辯狀應記載：答辯人與訴訟標的、答辯意旨（即為何主張駁回對方請求）、事實與理由、所舉證據方法。'
        + '三、注意答辯期間：民事為判決送達後十五日內（民訴§158），逾時可能喪失辯論機會。'
        + '四、本工具已整理好的事實與爭點清單，可直接作為撰寫答辯狀時的骨架。'
    }
  });
});

export default router;
