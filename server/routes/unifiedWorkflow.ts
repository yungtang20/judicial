import { Router, Request, Response } from "express";
import { AIProvider } from "../../src/ai/providers/AIProvider.js";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { OpenAICompatibleProvider } from "../../src/ai/providers/OpenAICompatibleProvider.js";
import { 
  buildQuestioningPrompt, 
  buildSyllogismEnginePrompt,
  RouterEvaluationResult 
} from "../../src/prompts/legalProcessPrompts.js";
import { defaultLegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { retrieve } from "../services/legalRetrieval.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import { verifyExternalPrecedents } from "../../src/lib/externalCitationVerifier.js";
import type { ExternalCitationResult } from "../../src/lib/externalCitationVerifier.js";
import { 
  LegalWorkflowState, 
  createInitialWorkflowState 
} from "../../src/lib/workflow/unifiedStateGraph.js";
import { 
  buildIntelligentRuleBasedTriage, 
  enforceTriageConsistency,
  detectTemporalConflict 
} from "../../src/lib/universalTriage.js";
import { formatLegalChapter } from "../../src/lib/legalChapterLabels.js";
import { searchOfficialJudgments, verifyOfficialCitations } from "../services/officialCitationVerification.js";
import { isBasicSafeUrl, verifyDnsSafe } from "./fetchUrl.js";

const router = Router();

export function keepExternallyVerifiedPrecedents<T extends { caseNumber: string }>(
  precedents: T[],
  checks: ExternalCitationResult[] = []
): T[] {
  const verified = new Set(checks.filter(item => item.status === 'verified' && item.exactMatch).map(item => item.citation));
  return precedents.filter(precedent => verified.has(precedent.caseNumber));
}

export function keepStatuteRelatedReferences<T extends { citation: string; title: string; excerpt?: string }>(references: T[], statuteCitations: string[]): T[] {
  const targets = statuteCitations.map(citation => citation.split("（")[0].trim()).filter(Boolean);
  return references.filter(item => targets.some(target => `${item.citation} ${item.title} ${item.excerpt || ""}`.includes(target))).slice(0, 3);
}

export interface CustomAIProviderInput {
  providerType?: "custom";
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Builds a request-scoped Custom Provider without mutating process.env.
 * Blank fields intentionally fall back to the server-side Agnes defaults.
 */
export async function resolveRequestAIProvider(input: unknown): Promise<AIProvider> {
  if (input == null) return defaultAIProvider;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("AI_PROVIDER_CONFIG_INVALID");
  }

  const config = input as CustomAIProviderInput;
  if (config.providerType !== "custom") throw new Error("AI_PROVIDER_TYPE_UNSUPPORTED");

  const baseUrl = typeof config.baseUrl === "string" && config.baseUrl.trim()
    ? config.baseUrl.trim()
    : "https://apihub.agnes-ai.com/v1";
  const urlCheck = isBasicSafeUrl(baseUrl);
  if (!urlCheck.safe || !urlCheck.parsed || urlCheck.parsed.protocol !== "https:") {
    throw new Error("AI_PROVIDER_URL_INVALID");
  }
  if (!(await verifyDnsSafe(urlCheck.parsed.hostname))) {
    throw new Error("AI_PROVIDER_URL_DNS_UNSAFE");
  }

  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : undefined;
  const model = typeof config.model === "string" && config.model.trim() ? config.model.trim() : "agnes-3.0-flash";
  if (baseUrl.length > 2048 || model.length > 128 || (apiKey && apiKey.length > 512)) {
    throw new Error("AI_PROVIDER_CONFIG_TOO_LARGE");
  }
  if (!/^[A-Za-z0-9._:/-]+$/.test(model)) throw new Error("AI_PROVIDER_MODEL_INVALID");

  return new OpenAICompatibleProvider({
    providerId: "CUSTOM",
    providerName: "CustomProvider",
    apiKeyEnv: "AGNES_API_KEY",
    baseUrlEnv: "AGNES_BASE_URL",
    modelEnv: "AGNES_MODEL",
    timeoutEnv: "AGNES_TIMEOUT_MS",
    defaultBaseUrl: "https://apihub.agnes-ai.com/v1",
    defaultModel: "agnes-3.0-flash",
    apiKey: apiKey || undefined,
    baseUrl,
    model
  });
}

/**
 * 節點 1：RouterNode 執行器
 * 全面調用既有 universalTriage 法律分流與一致性校驗核心，消除雙軌分流差異
 */
async function runRouterNode(userInput: string): Promise<RouterEvaluationResult & {
  category?: string;
  caseType?: string;
  legalBasis?: string[];
  protectionNotice?: string;
  statuteOfLimitations?: string;
  suggestedActions?: string[];
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
    chapter: formatLegalChapter(triage.category),
    cause: triage.identifiedIssue || "法律爭議請求權與程序分析",
    category: triage.category,
    caseType: triage.caseType,
    legalBasis: triage.legalBasis || [],
    is_sensitive: Boolean(triage.isSensitive),
    protectionNotice: triage.protectionNotice || "",
    statuteOfLimitations: triage.statuteOfLimitations,
    suggestedActions: triage.suggestedActions,
    is_complete: isComplete,
    missing_elements: missingElements,
    temporalConflict: temporal
  };
}

/**
 * 節點 2：QuestioningNode 執行器
 */
export function buildRuleBasedQuestioning(missingElements: string[]): { rawMessage: string; suggestedOptions: string[] } {
  const missing = (missingElements.length > 0 ? missingElements : ["案發時間與關係人身分"])
    .map(item => item.replace(/^【[^】]+】/, "").trim())
    .filter(Boolean)
    .slice(0, 2);
  const questions = missing.map((item, index) => `${index + 1}. 請補充「${item}」的具體事實；若不確定，也請說明目前可確認的範圍。`);
  const focus = missing[0] || "關鍵事實";
  let suggestedOptions: string[];

  if (/時間|日期|何時|期間/.test(focus)) {
    suggestedOptions = ["我可以補充確切日期與時間", "只能確認大約的時間範圍", "目前無法確認發生時間"];
  } else if (/身分|關係|對方|當事人/.test(focus)) {
    suggestedOptions = ["我可以補充雙方身分與關係", "只知道對方部分身分資料", "目前無法確認對方真實身分"];
  } else if (/證據|紀錄|文件|契約|截圖|錄音|驗傷/.test(focus)) {
    suggestedOptions = ["已有原始文件或電子紀錄", "只有部分紀錄，仍可補充", "目前沒有可提供的客觀證據"];
  } else if (/金額|價額|損失|費用/.test(focus)) {
    suggestedOptions = ["我可以補充確切金額與計算方式", "只能提供估算金額", "目前無法確認損失金額"];
  } else if (/地點|地址|處所/.test(focus)) {
    suggestedOptions = ["我可以補充確切地點", "只能確認縣市或大概區域", "目前無法確認發生地點"];
  } else {
    suggestedOptions = [`我可以補充「${focus.slice(0, 28)}」`, "目前只能提供部分資訊", "目前無法確認這項事實"];
  }

  return {
    rawMessage: `目前資料不足以安全完成法律判斷，請依序補充：\n${questions.join("\n")}\n\n這些資訊會影響法條適用、舉證責任或程序期限；無法確認時，系統會維持待人工審查。`,
    suggestedOptions
  };
}

export function buildOfficialJudgmentQueries(queryTopic: string, statuteCitations: string[]): string[] {
  const candidates = [
    queryTopic.replace(/法律爭議|請求權|程序分析|相關/g, " ").replace(/\s+與\s+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60),
    statuteCitations[0]?.trim()
  ].filter((value): value is string => Boolean(value));
  return Array.from(new Set(candidates));
}

export function buildOfficialSearchEvidence(results: Array<{
  caseNumber: string;
  sourceUrl: string;
  checkedAt: string;
  summary: string;
  contentHash: string;
}>) {
  return results.map(result => ({
    citation: result.caseNumber,
    type: "PRECEDENT",
    status: "VERIFIED",
    source: "司法院裁判書系統",
    sourceUrl: result.sourceUrl,
    checkedAt: result.checkedAt,
    snippet: result.summary.slice(0, 240),
    contentHash: result.contentHash,
    // 搜尋結果可證明裁判與摘錄存在，但不等於該裁判支持使用者的法律主張。
    claimSupportStatus: "NEEDS_REVIEW" as const
  }));
}

async function runQuestioningNode(
  missingElements: string[], 
  userInput: string,
  temporalConflict?: ReturnType<typeof detectTemporalConflict>,
  aiProvider: AIProvider = defaultAIProvider
): Promise<{ rawMessage: string; suggestedOptions: string[]; generationMode: "AI" | "RULE_FALLBACK"; generationReason: string }> {
  // 若有時間矛盾，優先生成具體矛盾澄清追問
  if (temporalConflict?.hasConflict && temporalConflict.questionPrompt) {
    const rawMessage = `【案件事實矛盾澄清】系統在比對您的案情時發現時間陳述有邏輯矛盾：\n${temporalConflict.conflictDetail}\n\n👉 ${temporalConflict.questionPrompt}\n\n請協助確認正確的發生時間，避免因時間錯誤導致告訴期間或民事時效起算產生重大誤差。`;
    const suggestedOptions = [
      `確認為：${temporalConflict.explicitDate}`,
      `確認為：${temporalConflict.relativeDate}`,
      "兩者皆為誤記，我重新輸入具體日期"
    ];
    return { rawMessage, suggestedOptions, generationMode: "RULE_FALLBACK", generationReason: "TEMPORAL_CONFLICT_RULE" };
  }

  const missing = missingElements.length > 0 ? missingElements : ["案發時間與關係人身分"];
  let rawMessage = "";
  let suggestedOptions: string[] = [];
  let generationMode: "AI" | "RULE_FALLBACK" = "AI";
  let generationReason = "AI_PROVIDER";

  try {
    const prompt = `${buildQuestioningPrompt(missing, userInput)}

請只回傳 JSON 物件，不得加入 Markdown：
{"rawMessage":"給使用者的完整追問文字","suggestedOptions":["選項一","選項二","選項三"]}`;
    const aiPromise = aiProvider.generateStructured<{
      rawMessage?: unknown;
      suggestedOptions?: unknown;
    }>(prompt, {
      type: "object",
      properties: {
        rawMessage: { type: "string" },
        suggestedOptions: { type: "array", items: { type: "string" } }
      },
      required: ["rawMessage", "suggestedOptions"]
    }, { temperature: 0.3 });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI_QUESTION_TIMEOUT_ERR")), 45000)
    );
    const response = await Promise.race([aiPromise, timeoutPromise]);
    rawMessage = typeof response.rawMessage === "string" ? response.rawMessage.trim() : "";
    suggestedOptions = Array.isArray(response.suggestedOptions)
      ? Array.from(new Set(response.suggestedOptions
        .filter((option): option is string => typeof option === "string")
        .map(option => option.trim())
        .filter(Boolean)))
        .slice(0, 5)
      : [];
    if (!rawMessage || suggestedOptions.length < 2) throw new Error("AI_QUESTION_FORMAT_INVALID");
  } catch (err) {
    console.warn("[UnifiedWorkflow] AI QuestioningNode 異常或逾時，採用缺件導向規則備援:", err instanceof Error ? err.message : "UNKNOWN");
    const fallback = buildRuleBasedQuestioning(missing);
    rawMessage = fallback.rawMessage;
    suggestedOptions = fallback.suggestedOptions;
    generationMode = "RULE_FALLBACK";
    generationReason = "AI_PROVIDER_UNAVAILABLE_OR_INVALID";
  }

  return { rawMessage, suggestedOptions, generationMode, generationReason };
}

/**
 * 節點 4：RAGNode 執行器（動態檢索條文與領域過濾，嚴禁無關條文污染與硬編碼）
 */
async function runRagNode(
  queryTopic: string, 
  userFacts: string,
  triageMeta: { caseType?: string; category?: string; isSensitive?: boolean; legalBasis?: string[]; missing_elements?: string[] }
): Promise<{
  searchQuery: string;
  legalElements: string;
  statuteCitations: string[];
  precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string; citedStatutes?: string[] }>;
  interpretations: Array<{ citation: string; title: string; excerpt?: string; sourceUrl?: string }>;
  officialEvidence: Array<{ citation: string; type: string; status: string; source: string; sourceUrl: string; checkedAt: string; snippet?: string; contentHash?: string; claimSupportStatus?: "SUPPORTED" | "NEEDS_REVIEW" | "UNVERIFIABLE"; error?: string }>;
  officialSearch?: { query: string; status: string; attempted: boolean; source: string; sourceUrl: string; checkedAt: string; error?: string };
}> {
  // 對外查詢只使用法律爭點與法源，不傳姓名、地址或完整案件敘述。
  const searchQuery = [queryTopic, ...(triageMeta.legalBasis || []).slice(0, 3)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const localSearchQuery = `${searchQuery} ${userFacts.slice(0, 80)}`.trim();
  let legalElements = "【法定構成要件】相關法律條文之客觀構成要件（行為主體、客體、侵害行為與因果關係）及主觀構成要件（故意或過失）。";
  const precedents: Array<{ caseNumber: string; courtName: string; summary: string; sourceUrl?: string; citedStatutes?: string[] }> = [];
  let interpretations: Array<{ citation: string; title: string; excerpt?: string; sourceUrl?: string }> = [];

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
    const chunks = await retrieve(localSearchQuery, {
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

  const statuteCitations = Array.from(dynamicStatuteSet).filter(Boolean);

  try {
    const retrieval = await defaultLegalRetrievalService.retrieveContext(searchQuery);
    if (retrieval.promptBlock && retrieval.promptBlock.trim().length > 0) {
      legalElements = retrieval.promptBlock;
    }
    interpretations = keepStatuteRelatedReferences(retrieval.sources.references, statuteCitations).map(item => ({
      citation: item.citation,
      title: item.title,
      excerpt: item.excerpt,
      sourceUrl: item.sourceUrl,
    }));
  } catch (err) {
    console.warn("[UnifiedWorkflow] RAGNode 檢索失敗:", err);
  }

  let officialSearch: Awaited<ReturnType<typeof searchOfficialJudgments>> | undefined;

  // 本機沒有具官方證據的裁判時，直接查詢司法院公開裁判書系統。
  if (precedents.length === 0) {
    for (const officialQuery of buildOfficialJudgmentQueries(queryTopic, statuteCitations)) {
      officialSearch = await searchOfficialJudgments(officialQuery, { timeoutMs: 8000, maxResults: 3, targetStatuteCitations: statuteCitations });
      if (officialSearch.status !== "NOT_FOUND") break;
    }
    for (const result of officialSearch?.results || []) {
      precedents.push({
        caseNumber: result.caseNumber,
        courtName: result.courtName,
        summary: result.summary,
        sourceUrl: result.sourceUrl,
        citedStatutes: result.citedStatutes
      });
    }
  }

  const discoveredCitations = new Set((officialSearch?.results || []).map(result => result.caseNumber));
  const official = await verifyOfficialCitations([
    ...statuteCitations.map(c => ({ citation: c, type: "STATUTE" as const })),
    ...precedents
      .filter(precedent => !discoveredCitations.has(precedent.caseNumber))
      .map(p => ({ citation: p.caseNumber, type: "PRECEDENT" as const, claim: p.summary }))
  ]);
  const discoveredEvidence = buildOfficialSearchEvidence(officialSearch?.results || []);

  return {
    searchQuery,
    legalElements,
    statuteCitations: statuteCitations.length > 0 ? statuteCitations : (triageMeta.legalBasis || ["現行相關實體法規"]),
    precedents,
    interpretations,
    officialEvidence: [...official.evidence, ...discoveredEvidence],
    officialSearch
  };
}

/**
 * 節點 5：SyllogismNode 執行器（含敏感案件強制專屬檢討條文，嚴禁泛用侵權起手）
 */
async function runSyllogismNode(
  legalElements: string, 
  userFacts: string,
  routerMeta: { is_sensitive?: boolean; category?: string; protectionNotice?: string; legalBasis?: string[]; missing_elements?: string[] },
  aiProvider: AIProvider = defaultAIProvider
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
    const prompt = buildSyllogismEnginePrompt(legalElements, userFacts.trim(), routerMeta.missing_elements);
    const aiPromise = aiProvider.generate(prompt, { temperature: 0.2 });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI_SYLLOGISM_TIMEOUT")), 45000)
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
  legalBasis: string[],
  precedentCitations: string[] = []
): Promise<{
  totalChecked: number;
  ghostCount: number;
  results: any[];
  sanitizedText: string;
  externalCitations?: any[];
  passGate: boolean;
  verificationStatus: "PASS" | "NEEDS_REVIEW" | "FAIL";
  warningNotice?: string;
  officialEvidence?: Array<{ citation: string; type: string; status: string; source: string; sourceUrl: string; checkedAt: string; snippet?: string; error?: string }>;
}> {
  const combinedText = `${analysisText}\n\n${userFacts}\n\n${legalBasis.join(" ")}`;
  const verification = verifyLegalCitations(combinedText);
  const official = await verifyOfficialCitations(verification.results.map(r => ({
    citation: r.citationText,
    type: r.type === "PRECEDENT" ? "PRECEDENT" as const : "STATUTE" as const,
    claim: r.legalClaim
  })));

  // 萃取裁判字號進行外部查驗（若有）
  let externalCitations: any[] = [];
  const citationMatches = combinedText.match(/\d+\s*年(?:度)?\s*[^\d\s]+?\s*字?\s*第\s*\d+\s*號/g) || [];
  const uniqueCitations = Array.from(new Set([...precedentCitations, ...citationMatches])).slice(0, 5);
  if (uniqueCitations.length > 0) {
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
  } else if (verification.totalChecked === 0 || !hasLegalBasis || !official.allVerified) {
    passGate = false;
    verificationStatus = "NEEDS_REVIEW";
    warningNotice = !official.attempted && official.reason === "NO_CITATIONS"
      ? "目前沒有可供系統查驗的引用，因此結論僅供參考，請補充法條或交由專業人士確認。"
      : official.evidence.some(e => e.status === "UNAVAILABLE")
      ? "暫時無法連線至官方資料庫，因此結論僅供參考，請稍後重新分析或交由專業人士確認。"
      : "部分引用尚未經官方資料庫確認，因此目前只能參考，不能直接用於書狀或法律主張。";
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
    warningNotice,
    officialEvidence: official.evidence
  };
}

async function completeWorkflow(
  state: LegalWorkflowState,
  routerResult: Awaited<ReturnType<typeof runRouterNode>>,
  narrative: string,
  requestAIProvider: AIProvider
): Promise<void> {
  state.currentStep = 'RAG_RETRIEVAL';
  const ragData = await runRagNode(routerResult.cause, narrative, {
    caseType: routerResult.caseType,
    category: routerResult.category,
    isSensitive: routerResult.is_sensitive,
    legalBasis: routerResult.legalBasis,
    missing_elements: routerResult.missing_elements
  });
  state.rag = ragData;

  state.currentStep = 'SYLLOGISM';
  state.syllogism = await runSyllogismNode(ragData.legalElements, narrative, {
    is_sensitive: routerResult.is_sensitive,
    category: routerResult.category,
    protectionNotice: routerResult.protectionNotice,
    legalBasis: routerResult.legalBasis,
    missing_elements: routerResult.missing_elements
  }, requestAIProvider);

  state.currentStep = 'VERIFICATION_GATE';
  state.verification = await runVerificationGateNode(
    state.syllogism.fullAnalysis,
    narrative,
    routerResult.legalBasis || [],
    ragData.precedents.map(precedent => precedent.caseNumber)
  );
  state.rag.precedents = keepExternallyVerifiedPrecedents(ragData.precedents, state.verification.externalCitations);
  state.currentStep = 'COMPLETED';
  state.updatedAt = Date.now();
}

/**
 * POST /api/workflow/execute
 * 統一入口自動化工作流主端點
 */
router.post("/api/workflow/execute", async (req: Request, res: Response) => {
  try {
    const { userInput, inputType = "facts", stateId, acknowledgeSafety, aiConfig } = req.body as {
      userInput?: string;
      inputType?: "facts" | "judgment_document";
      stateId?: string;
      acknowledgeSafety?: boolean;
      aiConfig?: unknown;
    };

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: "請提供案情描述或輸入文本" });
    }
    if (inputType !== "facts" && inputType !== "judgment_document") {
      return res.status(400).json({ error: "輸入資料類型無效" });
    }

    let requestAIProvider: AIProvider;
    try {
      requestAIProvider = await resolveRequestAIProvider(aiConfig);
    } catch (error: any) {
      return res.status(400).json({ error: "AI 提供商設定無效", code: error?.message || "AI_PROVIDER_CONFIG_INVALID" });
    }

    const state: LegalWorkflowState = createInitialWorkflowState(userInput.trim());
    if (stateId) state.id = stateId;

    // 步驟 1: RouterNode 評估（全面調用 universalTriage）
    state.currentStep = 'ROUTER';
    const routerResult = await runRouterNode(state.userNarrative);
    state.router = routerResult;

    // 敏感案件的保護資料保留到最終「行動指引」顯示，不在追問前打斷流程。
    const isSexualAutonomy = routerResult.category === 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT' ||
      Boolean(routerResult.chapter?.includes("性自主")) ||
      Boolean(routerResult.cause?.includes("性自主")) ||
      /性自主|性侵|猥褻|乘機性交|強制性交/.test(state.userNarrative);

    if (routerResult.is_sensitive) {
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
        acknowledged: Boolean(acknowledgeSafety || isSexualAutonomy)
      };

    }

    // 裁判書本身已是完整法律文件，直接分析；只有一般案情首次輸入需要動態追問。
    if (inputType === "judgment_document") {
      await completeWorkflow(state, routerResult, state.userNarrative, requestAIProvider);
      return res.json({ success: true, data: state });
    }

    state.currentStep = 'QUESTIONING';
    state.questioning = await runQuestioningNode(
      routerResult.missing_elements,
      state.userNarrative,
      routerResult.temporalConflict,
      requestAIProvider
    );
    return res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("[UnifiedWorkflow] 執行工作流失敗:", error);
    return res.status(500).json({
      error: "統一工作流執行失敗",
      message: "統一工作流執行失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
    });
  }
});

/**
 * POST /api/workflow/supplement
 * 用戶在 Questioning 階段補充事實後重新進入工作流
 */
router.post("/api/workflow/supplement", async (req: Request, res: Response) => {
  try {
    const { existingNarrative, supplementText, acknowledgeSafety, aiConfig } = req.body as {
      existingNarrative?: string;
      supplementText?: string;
      acknowledgeSafety?: boolean;
      aiConfig?: unknown;
    };

    if (!supplementText || !supplementText.trim()) {
      return res.status(400).json({ error: "請提供補充內容" });
    }

    let requestAIProvider: AIProvider;
    try {
      requestAIProvider = await resolveRequestAIProvider(aiConfig);
    } catch (error: any) {
      return res.status(400).json({ error: "AI 提供商設定無效", code: error?.message || "AI_PROVIDER_CONFIG_INVALID" });
    }

    const merged = existingNarrative && existingNarrative.trim()
      ? `${existingNarrative.trim()}\n【補充事實】：${supplementText.trim()}`
      : supplementText.trim();

    // 轉發執行統一 Router
    const routerResult = await runRouterNode(merged);
    const state = createInitialWorkflowState(merged);
    state.router = routerResult;
    state.factHistory = [existingNarrative || "", supplementText.trim()];

    if (routerResult.is_sensitive) {
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
        acknowledged: Boolean(acknowledgeSafety)
      };
    }

    // 若仍不完整或仍存在時間矛盾，繼續中斷工作流
    if (!routerResult.is_complete) {
      // 時間矛盾屬於重大邏輯錯誤，無法生成草稿，必須嚴格中斷
      if (routerResult.temporalConflict?.hasConflict) {
        state.currentStep = 'QUESTIONING';
        state.questioning = await runQuestioningNode(
          routerResult.missing_elements,
          merged,
          routerResult.temporalConflict,
          requestAIProvider
        );
        return res.json({ success: true, data: state });
      }
      
      // 彈性驗證：不中斷，繼續往下生成初步草稿
    }

    await completeWorkflow(state, routerResult, merged, requestAIProvider);

    return res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("[UnifiedWorkflow] 補充事實重評失敗:", error);
    return res.status(500).json({
      error: "處理補充事實失敗",
      message: "處理補充事實失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
    });
  }
});


/**
 * POST /api/workflow/suggest-field
 * 提供表單欄位的 AI 建議
 */
router.post("/api/workflow/suggest-field", async (req: Request, res: Response) => {
  try {
    const { fieldLabel, toolName, incidentDetails } = req.body;
    const prompt = `你是一位專業的法律表單填寫助手。使用者正在準備【${toolName}】，但在「${fieldLabel}」欄位不知道該填什麼。
請根據以下案件事實（若無則依一般常見情境），提供 3 個簡短、具體、且符合該欄位要求的填寫選項，讓使用者可以直接套用。

案件事實：${incidentDetails || "未提供"}

請直接輸出一個 JSON 陣列，包含 3 個字串，例如：["選項一", "選項二", "選項三"]。絕不輸出任何其他文字或 Markdown 標記（不要有 json 等）。`;

    const response = await defaultAIProvider.generate(prompt, { temperature: 0.7 });
    let text = response.text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    const match = text.match(/\[.*\]/s);
    const jsonStr = match ? match[0] : '[]';
    const options = JSON.parse(jsonStr);
    return res.json({ success: true, options });
  } catch (error: any) {
    console.error('[SuggestField] 取得建議失敗:', error);
    return res.status(500).json({
      error: "取得建議失敗",
      message: "取得建議失敗，請稍後再試",
      details: process.env.NODE_ENV === "production" ? undefined : error?.message
    });
  }
});

export default router;
