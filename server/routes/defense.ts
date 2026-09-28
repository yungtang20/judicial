import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { containsSimplifiedChinese } from "../../src/lib/traditionalChineseGuard.js";
import { describePrecheckRejection } from "../../src/lib/precheckRejectionMessage.js";
import { Router, Request, Response } from "express";
import { defaultAIProvider as configuredAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { getBPointTriagePrompt, getMineScanPrompt, getDefensePleadingPrompt } from "../../src/prompts/defense-workflow.js";
import { buildFallbackDefenseTriage, buildFallbackMineScan, buildFallbackDefensePleading } from "../../src/utils/defenseFallbacks.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { defaultLegalGenerationPipeline, defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { extractJsonFromText } from './extractJson.js';
import { toTraditionalChineseIn } from './toTraditionalIn.js';

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
    // 提示詞要求「嚴格輸出標準 JSON」，但未告知供應商需要 JSON 模式。
    // 實測 defense-triage 幾乎每次都靜默降級成 32 字的規則輸出，
    // 而同樣呼叫 AI 的 agent-chat / triage-universal 都正常——差別就在這裡。
    // 供應商支援 response_format: json_object，與提示詞的宣告一致，
    // 模型就不會夾帶說明文字或 markdown 導致解析失敗。
    const aiRes = await configuredAIProvider.generate(fullPrompt, { responseMimeType: 'application/json' });
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
