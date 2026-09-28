import { containsSimplifiedChinese, describeSimplifiedChinese } from "../../src/lib/traditionalChineseGuard.js";
import {
  LegalSearchSources,
  retrieveLegalContext,
  searchLegalSources,
  LegalPromptContext
} from "../../src/lib/twLegalRagClient.js";
import {
  verifyGeneratedDocument,
  verifyGeneratedDocumentWithOfficialSources,
  assertGeneratedDocumentVerified,
  GeneratedDocumentVerification
} from "../../src/lib/generatedDocumentPipeline.js";
import { verifyOfficialCitations } from "./officialCitationVerification.js";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { scrubPersonalInfo } from "../../src/lib/deidentifier.js";
import { LocalLegalKnowledgeBase, defaultLocalKnowledgeBase } from "../knowledge-base/localKnowledgeBase.js";
import { JudgmentKnowledgeBase, defaultJudgmentKnowledgeBase } from "../knowledge-base/judgmentKnowledgeBase.js";

/**
 * 檢索結果封裝，包含外部 RAG 是否啟用/使用的降級標記
 */
export interface RetrievalResult extends LegalPromptContext {
  isExternalRetrievalUsed: boolean;
  statusMessage: string;
}

/**
 * 判斷錯誤是否為上游 AI 服務的暫時性故障，值得重試。
 *
 * 只涵蓋「換一次請求很可能就成功」的情況：連線逾時、請求中止、5xx、429。
 * 驗證失敗、格式錯誤、輸入遭拒等屬於確定性結果，重試只會浪費額度且改變不了結果，
 * 因此明確排除。
 */
export function isTransientProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message || '';
  if (/GHOST_CITATION|VERIFICATION|INVALID_|REJECT|_REQUIRED|DENIED|unauthorized/i.test(message)) return false;
  // 逾時不重試。
  //
  // 逾時代表上游在 60 秒內無法完成；同一份提示詞再送一次，
  // 成功的機率不高，卻讓等待時間三倍化：
  // 60s + 0.8s + 60s + 2s + 60s = 182.8 秒。
  // 使用者按下「分析判決書」後可能盯著畫面三分鐘，
  // 比直接拿到明確的錯誤更糟。
  if (/aborted|timeout|timed out/i.test(message)) return false;

  // 連線層失敗與上游忙碌（5xx / 429）才值得重試：
  // 這兩種情況下一次嘗試很可能就會成功。
  if (/ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed/i.test(message)) return true;
  return /_HTTP_(5\d\d|429)\b/.test(message);
}

const TRANSIENT_RETRY_DELAYS_MS = [800, 2000] as const;

// 以 setTimeout 驅動，必須使用 executor 形式（Promise.withResolvers 需 ES2024 lib，本專案尚未启用）。
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * 僅暫時性錯誤才重試。匯出是為了能直接驗證「是否真的重試」這件事——
 * 只驗證 isTransientProviderError 的分類結果，無法證明呼叫端真的照做。
 */
import { aiBreaker, executeWithResilience } from './circuitBreaker.js';
import { TRADITIONAL_CHINESE_REQUIREMENT } from '../../src/prompts/languageRequirements.js';
import { toTraditionalChinese } from '../../src/lib/traditionalChineseGuard.js';

const AI_TIMEOUT_MS = 60000;

export async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TRANSIENT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === TRANSIENT_RETRY_DELAYS_MS.length;
      if (isLastAttempt || !isTransientProviderError(error)) throw error;
      await delay(TRANSIENT_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

/**
 * 檢索服務層介面：封裝實務檢索與上下文封裝，未來可擴充本地索引、Elasticsearch、法院開放資料等
 */
export interface ILegalRetrievalService {
  search(query: string): Promise<LegalSearchSources>;
  retrieveContext(query: string): Promise<RetrievalResult>;
}

/**
 * 具體 LegalRetrievalService 實作：支援外部 TW-Legal-RAG 與本機 Phase 3 Knowledge Base 雙軌協同
 */
export class LegalRetrievalService implements ILegalRetrievalService {
  constructor(
    private fetchImpl: typeof fetch = fetch,
    private localKb: LocalLegalKnowledgeBase = defaultLocalKnowledgeBase,
    private judgmentKb: JudgmentKnowledgeBase = defaultJudgmentKnowledgeBase
  ) {}

  async search(query: string): Promise<LegalSearchSources> {
    try {
      const extSources = await searchLegalSources(query, this.fetchImpl);
      if (extSources.enabled && extSources.provider === 'tw-legal-rag' && (extSources.allowedCitations?.length || 0) > 0) {
        return extSources;
      }
    } catch (err: any) {
      console.warn('[LegalRetrievalService] 外部 TW-Legal-RAG 查詢異常，降級本機知識庫:', err?.message || err);
    }
    
    // 降級使用自建本機知識庫 (Phase 3 法規/函釋 + Phase 4 判決)
    const [localSources, judgmentSources] = await Promise.all([
      this.localKb.retrieveAsSources(query),
      this.judgmentKb.retrieveAsSources(query)
    ]);
    
    return {
      enabled: true,
      provider: 'local-index-hybrid',
      disclaimer: '本資料由系統本機自建之法規、函釋與判決知識庫檢索（Phase 3 & 4 Local Index），僅供輔助參考。',
      statutes: localSources.statutes,
      references: localSources.references,
      judgments: judgmentSources.judgments,
      literature: [],
      allowedCitations: [
        ...(localSources.allowedCitations || []),
        ...(judgmentSources.allowedCitations || [])
      ]
    };
  }

  async retrieveContext(query: string): Promise<RetrievalResult> {
    let externalFailed = false;
    let context: LegalPromptContext | null = null;

    try {
      context = await retrieveLegalContext(query, this.fetchImpl);
    } catch (err: any) {
      externalFailed = true;
      console.warn('[LegalRetrievalService] 外部 TW-Legal-RAG 上下文連線異常:', err?.message || err);
    }

    const isExternal = Boolean(
      !externalFailed &&
      context?.sources?.enabled &&
      context?.sources?.provider === 'tw-legal-rag'
    );

    if (isExternal && context && context.hasCitations) {
      return {
        ...context,
        isExternalRetrievalUsed: true,
        statusMessage: '已連線外部 TW-Legal-RAG 檢索實務裁判見解'
      };
    }

    // 外部服務未啟用、離線、連線失敗或無有效引用，啟用本機法規/函釋與判決知識庫
    const sources = await this.search(query);
    const hasCitations = (sources.allowedCitations?.length || 0) > 0;
    
    let promptBlock = '';
    if (hasCitations) {
      const parts: string[] = ['【本機知識庫檢索之法規、函釋與實務判決見解】'];
      if (sources.statutes.length > 0) {
        parts.push('◆ 適用法規條文：');
        sources.statutes.forEach(s => parts.push(`- 【${s.citation}】${s.title}：${s.excerpt}`));
      }
      if (sources.references.length > 0) {
        parts.push('◆ 相關主管機關行政函釋：');
        sources.references.forEach(r => parts.push(`- 【${r.citation}】${r.title}：${r.excerpt}`));
      }
      if (sources.judgments.length > 0) {
        parts.push('◆ 相關實務判決節錄：');
        sources.judgments.forEach(j => parts.push(`- 【${j.citation}】${j.title}：\n${j.excerpt}`));
      }
      parts.push('（生成文書引用條文、函釋及判決時，請優先參酌上述法定規範與實務見解，並嚴格遵循三段論法，禁止捏造判決字號。）');
      promptBlock = parts.join('\n');
    }

    const statusMessage = hasCitations
      ? '外部 TLR 離線或查無結果，已切換至自建本機混合知識庫（Phase 3 & 4 Local Index）'
      : '外部 TLR 未啟用，且本機知識庫無相符見解，安全降級為現行實體法原則論述';

    return {
      sources,
      promptBlock,
      allowedCitations: sources.allowedCitations || [],
      disclaimer: sources.disclaimer,
      hasCitations,
      isExternalRetrievalUsed: false,
      statusMessage
    };
  }
}

export const defaultLegalRetrievalService = new LegalRetrievalService();

/**
 * Pipeline 執行參數
 */
export interface PipelineExecutionOptions<T = any> {
  ragQuery: string;
  /**
   * 根據檢索結果構建 Prompt。Pipeline 會自動在後方附加通用三段論規範，亦可自訂
   */
  buildPrompt: (retrieval: RetrievalResult) => string;
  /**
   * 可選的自訂 AI Provider，預設為 defaultAIProvider
   */
  aiProvider?: { generate: (prompt: string) => Promise<{ text: string }> };
  /**
   * 將 AI 返回之 raw text 解析為待檢驗之 documentText 及可選的 payload
   */
  parseResponse?: (rawText: string) => { documentText: string; payload?: T };
  /** 設為 false 可停用簡體中文的再生成機會（測試用）。 */
  simplifiedRetry?: boolean;
  /**
   * 當 AI 服務調用失敗時之降級生成函式，返回之 documentText 仍將嚴格執行檢驗
   */
  fallback?: (retrieval: RetrievalResult, error: Error) => { documentText: string; payload?: T };
  /**
   * 是否在 prompt 後方自動附加三段論法定規範（預設為 true）
   */
  appendSyllogismRules?: boolean;
}

/**
 * Pipeline 執行結果
 */
export interface PipelineExecutionResult<T = any> {
  documentText: string;
  payload?: T;
  antiGhostVerification: GeneratedDocumentVerification['antiGhostVerification'];
  legalSources: LegalSearchSources;
  isExternalRetrievalUsed: boolean;
  retrievalStatusMessage: string;
  retrievalDisclaimer: string;
  allowedCitations: string[];
}

/**
 * 統一 Legal Generation Pipeline
 * 強制執行規範流程：
 * 1. 先檢索 (Retrieve)
 * 2. 注入檢索結果與 allowed_citations (Inject)
 * 3. 呼叫 AI 或安全降級生成 (Generate)
 * 4. 嚴格執行 verifyGeneratedDocument 與 assertGeneratedDocumentVerified (Verify & Fail-Closed)
 */
export class LegalGenerationPipeline {
  constructor(
    private retrievalService: ILegalRetrievalService = defaultLegalRetrievalService,
    private defaultProvider = defaultAIProvider
  ) {}

  async execute<T = any>(options: PipelineExecutionOptions<T>): Promise<PipelineExecutionResult<T>> {
    // 步驟 1: 強制先檢索 (Retrieve)
    const retrieval = await this.retrievalService.retrieveContext(options.ragQuery);

    // 步驟 2: 注入檢索結果與 allowed_citations (Inject)
    const basePrompt = options.buildPrompt(retrieval);
    const appendRules = options.appendSyllogismRules !== false;
    // 語言要求必須由管線統一附加，不交給各呼叫端自行判斷。
    // 實測：管線組裝的 promptBlock 只含檢索內容與三段論規則，
    // 從未帶入 TRADITIONAL_CHINESE_REQUIREMENT——模型因此沒有被要求使用繁體，
    // 產出含簡體後被繁體閘門擋下，該功能恆定失敗。
    // 這正是 languageRequirements.ts 當初要集中管理、要避免各提示詞漏寫的原因。
    const withLanguage = appendRules
      ? `${basePrompt}\n\n${retrieval.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`
      : `${basePrompt}\n\n${retrieval.promptBlock}`;
    const fullPrompt = `${withLanguage}\n\n【輸出語言要求】${TRADITIONAL_CHINESE_REQUIREMENT}`;

    const provider = options.aiProvider || this.defaultProvider;
    let rawGeneratedText = '';
    let extracted: { documentText: string; payload?: T };

    // 步驟 3: 呼叫 AI 生成 (Generate，生成前進行個資去識別化防護)
    try {
      const sanitizedPrompt = scrubPersonalInfo(fullPrompt);
      // 上游 AI 服務偶發逾時或 5xx（實測約四成產製失敗源自此），
      // 這類暫時性故障重試即可成功；驗證失敗等確定性結果不在此重試，
      // 避免放寬任何安全閘門。
      // 外部 AI 服務加掛熔斷器：連續失敗達門檻後短路，
      // 避免在服務不可用時仍對每個請求發起重試而耗盡額度。
      // 熔斷開啟時由 executeWithResilience 擲出可理解的訊息，
      // 不會把外部錯誤的原始內容暴露給終端使用者。
      const aiRes = await executeWithResilience(
        () => provider.generate(sanitizedPrompt),
        {
          timeoutMs: AI_TIMEOUT_MS,
          maxRetries: 0,          // 重試已由 withTransientRetry 負責，此處不重複重試
          breaker: aiBreaker,
          fallbackMessage: 'AI 服務暫時無法連線，已啟動安全保護機制，請稍後再試'
        }
      );
      rawGeneratedText = aiRes.text || '';

      // 模型偶爾以簡體中文產出法律文件。
      //
      // 先前處方式是「要求模型改用繁體重新生成」——那是一次完整的
      // AI 呼叫，等於把已經花掉的 20~40 秒再花一次，而且不保證成功
      // （實測同一端點 5 次仍有 1 次因簡體被擋）。
      //
      // 改為確定性轉換：對照表是本專案自有並有測試維護
      // （見 simplifiedTableVariantChars.test.ts 的異體字防護），
      // 轉換成本近乎為零且結果確定。
      // 轉換後若仍有殘留，代表對照表未涵蓋，後續繁體閘門仍會擋下，
      // fail-closed 的原則沒有鬆動。
      if (containsSimplifiedChinese(rawGeneratedText) && options.simplifiedRetry !== false) {
        const 轉換後 = toTraditionalChinese(rawGeneratedText);
        if (!containsSimplifiedChinese(轉換後)) {
          console.warn("[LegalPipeline] 產出含簡體中文，已轉換為繁體後繼續");
          rawGeneratedText = 轉換後;
        } else {
          // 轉換後仍有殘留：交由後續繁體閘門 fail-closed，
          // 不用再花一次 AI 呼叫去碰運氣。
          console.warn("[LegalPipeline] 轉換後仍含未收錄的簡體字，交由繁體閘門擋下");
        }
      }

      if (options.parseResponse) {
        extracted = options.parseResponse(rawGeneratedText);
      } else {
        extracted = { documentText: rawGeneratedText };
      }
    } catch (aiErr: any) {
      if (options.fallback) {
        extracted = options.fallback(retrieval, aiErr instanceof Error ? aiErr : new Error(String(aiErr)));
      } else {
        throw aiErr;
      }
    }

    // 步驟 4: 強制防幽靈檢核 (Verify & Fail-Closed)
    // 本機法規種子僅收錄 24 條，未收錄者會被判為未驗證而擋下交付。
    // 這裡補上全國法規資料庫的即時查核：本機查不到但官方確認有效的條文予以升級，
    // 官方同樣查不到的仍維持未驗證並擋下（維持 fail-closed）。
    const strictAllowedOnly = (retrieval.allowedCitations?.length || 0) > 0;
    const verification = await verifyGeneratedDocumentWithOfficialSources(
      extracted.documentText,
      { allowedCitations: retrieval.allowedCitations, strictAllowedOnly },
      inputs => verifyOfficialCitations(inputs)
    );
    const verified = assertGeneratedDocumentVerified(verification);

    // 步驟 4b: 繁體中文閘門
    // 這是所有走本管線的書狀產製都會經過的最後一道把關。
    // 放在這裡可一次覆蓋多條呼叫路徑；先前只在使用該功能的測試中
    // 逐條路徑補防線，結果漏掉了共用管線本身。
    // 台灣法律文件出現簡體中文是正確性缺陷，與幽靈引用同級處理。
    if (containsSimplifiedChinese(verified.documentText)) {
      throw new Error(
        describeSimplifiedChinese('產製文件', verified.documentText)
      );
    }

    // 步驟 5: 封裝結構回傳
    return {
      documentText: verified.documentText,
      payload: extracted.payload,
      antiGhostVerification: verified.antiGhostVerification,
      legalSources: retrieval.sources,
      isExternalRetrievalUsed: retrieval.isExternalRetrievalUsed,
      retrievalStatusMessage: retrieval.statusMessage,
      retrievalDisclaimer: retrieval.disclaimer,
      allowedCitations: retrieval.allowedCitations
    };
  }
}

export const defaultLegalGenerationPipeline = new LegalGenerationPipeline();
