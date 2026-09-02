import fs from "node:fs";
import path from "node:path";
import {
  JudgmentChunk,
  JudgmentRetrievalFilter
} from "./judgmentTypes.js";
import { LegalSearchSources, LegalSourceItem } from "../../src/lib/twLegalRagClient.js";
import { LegalEmbedder, defaultEmbedder } from "../services/legalRetrieval.js";

// Utility for Cosine Similarity
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

// Basic Tokenizer
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

export interface HybridJudgmentResult {
  chunk: JudgmentChunk;
  score: number;
  keywordScore: number;
  vectorScore: number;
  matchedTokens: string[];
}

export class JudgmentKnowledgeBase {
  private chunks: JudgmentChunk[] = [];
  private embedder: LegalEmbedder;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private seedPath?: string, embedder?: LegalEmbedder) {
    this.embedder = embedder || defaultEmbedder;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const p = this.seedPath || path.resolve(process.cwd(), "server/knowledge-base/seeds/judgments.json");
      let rawData: JudgmentChunk[] = [];

      try {
        if (fs.existsSync(p)) {
          rawData = JSON.parse(fs.readFileSync(p, "utf-8"));
        }
      } catch (err: any) {
        console.warn("[JudgmentKnowledgeBase] 讀取 judgments.json 失敗:", err.message);
      }

      for (const chunk of rawData) {
        if (!chunk.embedding || chunk.embedding.length === 0) {
          const textToEmbed = `${chunk.metadata.caseNo} ${chunk.metadata.reason} ${chunk.content} ${(chunk.metadata.relatedStatutes || []).join(" ")}`;
          chunk.embedding = await this.embedder.embed(textToEmbed);
        }
      }

      this.chunks = rawData;
      this.initialized = true;
    })();

    return this.initPromise;
  }

  public async searchHybrid(
    query: string,
    topK = 3,
    filter?: JudgmentRetrievalFilter
  ): Promise<HybridJudgmentResult[]> {
    await this.init();

    const trimmed = (query || "").trim();
    if (!trimmed) return [];

    const queryEmbedding = await this.embedder.embed(trimmed);
    const queryTokens = tokenize(trimmed);

    const scoredResults: HybridJudgmentResult[] = [];

    for (const chunk of this.chunks) {
      // 1. Metadata Filters
      if (filter?.courtLevels && !filter.courtLevels.includes(chunk.metadata.court)) continue;
      if (filter?.sys && filter.sys !== chunk.metadata.sys) continue;
      if (filter?.dateRange) {
        if (chunk.metadata.date < filter.dateRange.start || chunk.metadata.date > filter.dateRange.end) continue;
      }

      // 2. Vector Score
      const vectorScore = chunk.embedding
        ? Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding))
        : 0;

      // 3. Keyword Score (BM25-like heuristics)
      let keywordScore = 0;
      const matchedTokens: string[] = [];

      if (trimmed.includes(chunk.metadata.caseNo) || chunk.metadata.caseNo.includes(trimmed)) {
        keywordScore += 1.5;
        matchedTokens.push(chunk.metadata.caseNo);
      }

      for (const token of queryTokens) {
        let matched = false;
        if (chunk.metadata.reason.includes(token)) {
          keywordScore += 0.5;
          matched = true;
        }
        if (chunk.content.includes(token)) {
          keywordScore += 0.2;
          matched = true;
        }
        if (chunk.metadata.relatedStatutes?.some(s => s.includes(token))) {
          keywordScore += 0.3;
          matched = true;
        }
        if (matched && !matchedTokens.includes(token)) {
          matchedTokens.push(token);
        }
      }

      const normalizedKeywordScore = Math.min(1.0, keywordScore / 2.0);
      // RRF 概念融合：此處簡化為加權平均
      const totalScore = (vectorScore * 0.4) + (normalizedKeywordScore * 0.6) + (keywordScore >= 1.5 ? 0.3 : 0);

      if (totalScore >= 0.15 || matchedTokens.length > 0) {
        scoredResults.push({
          chunk,
          score: Number(totalScore.toFixed(4)),
          keywordScore: Number(keywordScore.toFixed(4)),
          vectorScore: Number(vectorScore.toFixed(4)),
          matchedTokens
        });
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  public async retrieveAsSources(query: string, topK = 3): Promise<LegalSearchSources> {
    const results = await this.searchHybrid(query, topK);
    
    const judgmentItems: LegalSourceItem[] = results.map(r => ({
      kind: 'judgments',
      citation: r.chunk.metadata.caseNo,
      title: `${r.chunk.metadata.caseNo} ${r.chunk.metadata.reason} (${r.chunk.section})`,
      excerpt: r.chunk.content,
      sourceUrl: "https://judgment.judicial.gov.tw/",
      allowedCitation: true
    }));

    const allowedCitations = judgmentItems.map(j => j.citation);

    return {
      enabled: true,
      provider: 'local-index-judgment',
      disclaimer: '本系統檢索之判決節錄僅供參考，不代表最新實務見解，亦不構成正式法律建議，請務必至司法院系統查閱全文。',
      statutes: [],
      judgments: judgmentItems,
      references: [],
      literature: [],
      allowedCitations
    };
  }
}

export const defaultJudgmentKnowledgeBase = new JudgmentKnowledgeBase();
