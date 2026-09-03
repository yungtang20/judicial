// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  SQLiteVectorStore,
  LegalEmbedder,
  indexDocument,
  retrieve,
  cosineSimilarity,
  RetrievedChunk
} from "./legalRetrieval.js";
import { ingestSeedCorpus } from "./corpusIngest.js";

describe("Legal Retrieval Infrastructure (Stage 1)", () => {
  let inMemoryStore: SQLiteVectorStore;
  let embedder: LegalEmbedder;

  beforeEach(() => {
    inMemoryStore = new SQLiteVectorStore(":memory:");
    embedder = new LegalEmbedder();
  });

  it("calculates cosine similarity correctly", () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("inserts and counts documents in SQLiteVectorStore", async () => {
    expect(await inMemoryStore.count()).toBe(0);

    await inMemoryStore.insert({
      id: "test_doc_1",
      source: "statute",
      citation: "民法第184條",
      fullText: "因故意或過失，不法侵害他人之權利者，負損害賠償責任。",
      url: "https://law.moj.gov.tw/",
      embedding: [0.1, 0.2, 0.3]
    });

    expect(await inMemoryStore.count()).toBe(1);

    const doc = await inMemoryStore.getById("test_doc_1");
    expect(doc).toBeDefined();
    expect(doc?.citation).toBe("民法第184條");
    expect(doc?.source).toBe("statute");
  });

  it("indexes documents and retrieves with matching citations and keywords", async () => {
    await indexDocument(
      {
        id: "statute_184",
        source: "statute",
        citation: "民法第184條",
        fullText: "因故意或過失，不法侵害他人之權利者，負損害賠償責任。",
        url: "https://law.moj.gov.tw/184"
      },
      inMemoryStore,
      embedder
    );

    await indexDocument(
      {
        id: "judgment_98_1045",
        source: "judgment",
        citation: "最高法院98年度台上字第1045號民事判決",
        fullText: "消費借貸契約之成立，除金錢或其他代替物之交付外，尚須當事人間有借貸之合意。",
        url: "https://judgment.judicial.gov.tw/98_1045"
      },
      inMemoryStore,
      embedder
    );

    // 1. Retrieve statutes only
    const statuteResults = await retrieve("侵權行為損害賠償", {
      vectorStore: inMemoryStore,
      embedder,
      source: "statute"
    });
    expect(statuteResults.length).toBeGreaterThan(0);
    expect(statuteResults[0].source).toBe("statute");
    expect(statuteResults[0].citation).toBe("民法第184條");
    expect(statuteResults[0].sourceUrl).toBe("https://law.moj.gov.tw/184");

    // 2. Retrieve judgments only
    const judgmentResults = await retrieve("借貸合意", {
      vectorStore: inMemoryStore,
      embedder,
      source: "judgment"
    });
    expect(judgmentResults.length).toBeGreaterThan(0);
    expect(judgmentResults[0].source).toBe("judgment");
    expect(judgmentResults[0].citation).toContain("最高法院98年度台上字第1045號");
    expect(judgmentResults[0].sourceUrl).toBe("https://judgment.judicial.gov.tw/98_1045");
  });

  it("returns empty array when query is blank or no matches found", async () => {
    const blankResults = await retrieve("   ", { vectorStore: inMemoryStore, embedder });
    expect(blankResults).toEqual([]);

    const emptyStoreResults = await retrieve("任何查詢", { vectorStore: inMemoryStore, embedder });
    expect(emptyStoreResults).toEqual([]);
  });

  it("ingests verified seed statutes and precedents without hallucination", async () => {
    const stats = await ingestSeedCorpus(inMemoryStore, embedder);
    expect(stats.statutesCount).toBeGreaterThan(20);
    expect(stats.judgmentsCount).toBeGreaterThan(3);
    expect(stats.skippedCount).toBe(0);

    const count = await inMemoryStore.count();
    expect(count).toBe(stats.statutesCount + stats.judgmentsCount);

    // Test retrieval against the ingested seed corpus
    const results = await retrieve("消費借貸 金錢交付 合意", {
      vectorStore: inMemoryStore,
      embedder,
      source: "judgment"
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].citation).toContain("98");
    expect(results[0].sourceUrl).toContain("judgment.judicial.gov.tw");
  });
});
