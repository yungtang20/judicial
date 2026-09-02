import fs from "node:fs";
import path from "node:path";
import {
  LegalKnowledgeItem,
  HybridSearchResult,
  toLegalSourceItem
} from "./types.js";
import {
  LegalSearchSources,
  LegalPromptContext
} from "../../src/lib/twLegalRagClient.js";
import { LegalEmbedder, defaultEmbedder } from "../services/legalRetrieval.js";

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenize(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ").trim();
  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  const tokenSet = new Set<string>(words);

  for (const word of words) {
    if (/[\u4e00-\u9fa5]/.test(word)) {
      for (let i = 0; i < word.length - 1; i++) {
        tokenSet.add(word.slice(i, i + 2));
      }
    }
  }
  return Array.from(tokenSet);
}

function extractRelevantExcerpt(fullText: string, query: string, maxLength = 200): string {
  if (!fullText) return "";
  if (fullText.length <= maxLength) return fullText;

  const tokens = tokenize(query);
  let bestPos = -1;
  for (const token of tokens) {
    const pos = fullText.indexOf(token);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) {
    return fullText.slice(0, maxLength) + "…";
  }

  const start = Math.max(0, bestPos - 30);
  const end = Math.min(fullText.length, start + maxLength);
  const excerpt = fullText.slice(start, end);
  return (start > 0 ? "…" : "") + excerpt + (end < fullText.length ? "…" : "");
}

export interface LocalKnowledgeBaseOptions {
  embedder?: LegalEmbedder;
  statutesPath?: string;
  interpretationsPath?: string;
}

export class LocalLegalKnowledgeBase {
  private items: LegalKnowledgeItem[] = [];
  private embedder: LegalEmbedder;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private options: LocalKnowledgeBaseOptions = {}) {
    this.embedder = options.embedder || defaultEmbedder;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const statutesPath = this.options.statutesPath || path.resolve(process.cwd(), "server/knowledge-base/seeds/statutes.json");
      const interpPath = this.options.interpretationsPath || path.resolve(process.cwd(), "server/knowledge-base/seeds/interpretations.json");

      let rawStatutes: LegalKnowledgeItem[] = [];
      let rawInterp: LegalKnowledgeItem[] = [];

      try {
        if (fs.existsSync(statutesPath)) {
          rawStatutes = JSON.parse(fs.readFileSync(statutesPath, "utf-8"));
        }
      } catch (err: any) {
        console.warn("[LocalLegalKnowledgeBase] 讀取 statutes.json 失敗:", err.message);
      }

      try {
        if (fs.existsSync(interpPath)) {
          rawInterp = JSON.parse(fs.readFileSync(interpPath, "utf-8"));
        }
      } catch (err: any) {
        console.warn("[LocalLegalKnowledgeBase] 讀取 interpretations.json 失敗:", err.message);
      }

      const all = [...rawStatutes, ...rawInterp];
      for (const item of all) {
        if (!item.embedding || item.embedding.length === 0) {
          const textToEmbed = `${item.citation} ${item.name} ${item.articleOrCaseNo} ${item.title} ${item.content} ${(item.keywords || []).join(" ")}`;
          item.embedding = await this.embedder.embed(textToEmbed);
        }
      }

      this.items = all;
      this.initialized = true;
    })();

    return this.initPromise;
  }

  public addItem(item: LegalKnowledgeItem): void {
    this.items.push(item);
  }

  public getItemsCount(): number {
    return this.items.length;
  }

  /**
   * Hybrid 混合檢索（精準條號 Boost + BM25 Token 重疊 + 向量餘弦相似度）
   */
  public async searchHybrid(
    query: string,
    options?: {
      topK?: number;
      typeFilter?: 'statute' | 'interpretation';
      minScore?: number;
    }
  ): Promise<HybridSearchResult[]> {
    await this.init();

    const trimmed = (query || "").trim();
    if (!trimmed) return [];

    const topK = options?.topK || 5;
    const minScore = options?.minScore ?? 0.15;
    const typeFilter = options?.typeFilter;

    const queryEmbedding = await this.embedder.embed(trimmed);
    const queryTokens = tokenize(trimmed);

    // 擷取查詢中的法條數字（如 184、277、339）
    const numMatches = trimmed.match(/\d+/g) || [];

    const scoredResults: HybridSearchResult[] = [];

    for (const item of this.items) {
      if (typeFilter && item.type !== typeFilter) continue;

      // 1. 向量相似度
      const vectorScore = item.embedding
        ? Math.max(0, cosineSimilarity(queryEmbedding, item.embedding))
        : 0;

      // 2. 關鍵字與 Token 重疊分數
      let keywordScore = 0;
      const matchedTokens: string[] = [];

      // Citation 與 Name 完全比對加權
      if (trimmed.includes(item.citation) || item.citation.includes(trimmed)) {
        keywordScore += 1.5;
        matchedTokens.push(item.citation);
      }

      // 條號精確加權（例如輸入「184條」比對「第184條」）
      for (const num of numMatches) {
        if (item.articleOrCaseNo.includes(num)) {
          keywordScore += 1.0;
          matchedTokens.push(num);
        }
      }

      // 標題與關鍵字比對
      for (const token of queryTokens) {
        let tokenMatched = false;
        if (item.title.includes(token)) {
          keywordScore += 0.35;
          tokenMatched = true;
        }
        if (item.keywords && item.keywords.some(kw => kw.includes(token))) {
          keywordScore += 0.4;
          tokenMatched = true;
        }
        if (item.content.includes(token)) {
          keywordScore += 0.15;
          tokenMatched = true;
        }
        if (tokenMatched && !matchedTokens.includes(token)) {
          matchedTokens.push(token);
        }
      }

      // 3. 混合評分計算
      // 標準化 keywordScore
      const normalizedKeywordScore = Math.min(1.0, keywordScore / 2.0);
      const totalScore = (vectorScore * 0.4) + (normalizedKeywordScore * 0.6) + (keywordScore >= 1.5 ? 0.3 : 0);

      if (totalScore >= minScore || matchedTokens.length > 0) {
        scoredResults.push({
          item,
          score: Number(totalScore.toFixed(4)),
          keywordScore: Number(keywordScore.toFixed(4)),
          vectorScore: Number(vectorScore.toFixed(4)),
          matchedTokens,
          excerpt: extractRelevantExcerpt(item.content, trimmed)
        });
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  /**
   * 封裝為相容外部 twLegalRagClient 之 LegalSearchSources 結構
   */
  public async retrieveAsSources(query: string, topK = 6): Promise<LegalSearchSources> {
    await this.init();
    const hybridMatches = await this.searchHybrid(query, { topK });

    const statutes: LegalKnowledgeItem[] = [];
    const interpretations: LegalKnowledgeItem[] = [];
    const excerptsMap = new Map<string, string>();

    for (const match of hybridMatches) {
      excerptsMap.set(match.item.id, match.excerpt);
      if (match.item.type === 'statute') {
        statutes.push(match.item);
      } else {
        interpretations.push(match.item);
      }
    }

    const statuteItems = statutes.map(item => toLegalSourceItem(item, excerptsMap.get(item.id)));
    const referenceItems = interpretations.map(item => toLegalSourceItem(item, excerptsMap.get(item.id)));

    const allowedCitations = [
      ...statuteItems.map(s => s.citation),
      ...referenceItems.map(r => r.citation)
    ];

    return {
      enabled: true,
      provider: 'local-index',
      disclaimer: '本資料由系統本機自建之法規與函釋知識庫檢索（Phase 3 Local Index），僅供法律論述與起草輔助參考。',
      statutes: statuteItems,
      judgments: [],
      references: referenceItems,
      literature: [],
      allowedCitations
    };
  }

  /**
   * 轉化為可用於 Prompt 注入的上下文區塊
   */
  public async retrievePromptContext(query: string): Promise<LegalPromptContext> {
    const sources = await this.retrieveAsSources(query);
    const hasCitations = (sources.allowedCitations?.length || 0) > 0;

    let promptBlock = '';
    if (hasCitations) {
      const parts: string[] = ['【本機知識庫檢索之法規與函釋見解】'];
      if (sources.statutes.length > 0) {
        parts.push('◆ 適用法規條文：');
        sources.statutes.forEach(s => {
          parts.push(`- 【${s.citation}】${s.title}：${s.excerpt}`);
        });
      }
      if (sources.references.length > 0) {
        parts.push('◆ 相關主管機關行政函釋：');
        sources.references.forEach(r => {
          parts.push(`- 【${r.citation}】${r.title}：${r.excerpt}`);
        });
      }
      parts.push('（生成文書引用條文及函釋時，請優先參酌上述法定規範與實務解釋，並嚴格遵循三段論法。）');
      promptBlock = parts.join('\n');
    }

    return {
      sources,
      promptBlock,
      allowedCitations: sources.allowedCitations || [],
      disclaimer: sources.disclaimer,
      hasCitations
    };
  }
}

export const defaultLocalKnowledgeBase = new LocalLegalKnowledgeBase();
