import { VERIFIED_REAL_STATUTES, VERIFIED_REAL_PRECEDENTS } from "../../src/lib/citationVerifier.js";
import { indexDocument, VectorStore, defaultVectorStore, defaultEmbedder, LegalEmbedder } from "./legalRetrieval.js";

export interface IngestStats {
  statutesCount: number;
  judgmentsCount: number;
  skippedCount: number;
}

/**
 * Ingest verified seed statutes and precedents into the vector database.
 * Does not hallucinate or make up any legal content.
 */
export async function ingestSeedCorpus(
  vectorStore: VectorStore = defaultVectorStore,
  embedder: LegalEmbedder = defaultEmbedder
): Promise<IngestStats> {
  const stats: IngestStats = {
    statutesCount: 0,
    judgmentsCount: 0,
    skippedCount: 0,
  };

  // 1. Ingest Verified Real Statutes
  for (const [key, item] of Object.entries(VERIFIED_REAL_STATUTES)) {
    if (!item.officialSummary || !item.lawName || !item.article) {
      console.warn(`[CorpusIngest] 跳過無效法規項目: ${key}`);
      stats.skippedCount++;
      continue;
    }

    const citation = `${item.lawName}${item.article}`;
    const fullText = `${item.officialSummary} 關鍵字：${item.keywords ? item.keywords.join("、") : ""}`;
    const url = "https://law.moj.gov.tw/";

    try {
      await indexDocument(
        {
          id: `statute_${item.lawName}_${item.article}`.replace(/[\s\/]+/g, "_"),
          source: "statute",
          citation,
          fullText,
          url,
          metadata: {
            lawName: item.lawName,
            article: item.article,
            keywords: item.keywords,
          }
        },
        vectorStore,
        embedder
      );
      stats.statutesCount++;
    } catch (err: any) {
      console.warn(`[CorpusIngest] 匯入法規失敗 [${citation}]:`, err.message);
      stats.skippedCount++;
    }
  }

  // 2. Ingest Verified Real Precedents
  for (const item of VERIFIED_REAL_PRECEDENTS) {
    if (!item.fullCitation || !item.holdingSummary) {
      console.warn(`[CorpusIngest] 跳過無效判決項目: ${item.fullCitation || "未知"}`);
      stats.skippedCount++;
      continue;
    }

    const id = `judgment_${item.caseYear}_${item.caseWord}_${item.caseNum}`.replace(/[\s\/]+/g, "_");
    const fullText = `${item.holdingSummary} 裁判關鍵字：${item.legalKeywords ? item.legalKeywords.join("、") : ""}`;
    const url = item.officialJudicialUrl || "https://judgment.judicial.gov.tw/";

    try {
      await indexDocument(
        {
          id,
          source: "judgment",
          citation: item.fullCitation,
          fullText,
          url,
          metadata: {
            court: item.court,
            caseYear: item.caseYear,
            caseWord: item.caseWord,
            caseNum: item.caseNum,
            keywords: item.legalKeywords,
          }
        },
        vectorStore,
        embedder
      );
      stats.judgmentsCount++;
    } catch (err: any) {
      console.warn(`[CorpusIngest] 匯入判決失敗 [${item.fullCitation}]:`, err.message);
      stats.skippedCount++;
    }
  }

  return stats;
}
