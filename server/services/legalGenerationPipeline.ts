import {
  LegalSearchSources,
  retrieveLegalContext,
  searchLegalSources,
  LegalPromptContext
} from "../../src/lib/twLegalRagClient.js";
import {
  verifyGeneratedDocument,
  assertGeneratedDocumentVerified,
  GeneratedDocumentVerification
} from "../../src/lib/generatedDocumentPipeline.js";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
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
    const fullPrompt = appendRules
      ? `${basePrompt}\n\n${retrieval.promptBlock}\n\n${UNIVERSAL_SYLLOGISM_RULES}`
      : `${basePrompt}\n\n${retrieval.promptBlock}`;

    const provider = options.aiProvider || this.defaultProvider;
    let rawGeneratedText = '';
    let extracted: { documentText: string; payload?: T };

    // 步驟 3: 呼叫 AI 生成 (Generate)
    try {
      const aiRes = await provider.generate(fullPrompt);
      rawGeneratedText = aiRes.text || '';
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
    const verification = verifyGeneratedDocument(extracted.documentText, {
      allowedCitations: retrieval.allowedCitations
    });
    const verified = assertGeneratedDocumentVerified(verification);

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
