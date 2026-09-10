import { VERIFIED_REAL_STATUTES } from "../../src/lib/citationVerifier.js";
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

  // 裁判不得只因存在於靜態常數就視為已查證。裁判改由官方查詢流程逐筆取得，
  // 並在保存 sourceUrl、checkedAt 與 contentHash 後才可進入可信索引。

  return stats;
}
