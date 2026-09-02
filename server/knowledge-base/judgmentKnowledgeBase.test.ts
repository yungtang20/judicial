import { describe, expect, it, beforeEach } from "vitest";
import { JudgmentKnowledgeBase } from "./judgmentKnowledgeBase.js";
import { LegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { defaultLocalKnowledgeBase } from "./localKnowledgeBase.js";

describe("Phase 4: JudgmentKnowledgeBase & Hybrid RAG Integration", () => {
  let judgmentKb: JudgmentKnowledgeBase;

  beforeEach(async () => {
    judgmentKb = new JudgmentKnowledgeBase();
    await judgmentKb.init();
  });

  describe("Judgment Retrieval Benchmark", () => {
    it("should retrieve correctly based on keyword overlap (e.g., 損害賠償, 車禍, 理由)", async () => {
      const results = await judgmentKb.searchHybrid("損害賠償 折舊 修復費用");
      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.chunk.metadata.caseNo).toContain("112 年度台上字第 9 號");
    });

    it("should boost exact caseNo queries", async () => {
      const results = await judgmentKb.searchHybrid("111 年度台上字第 150 號");
      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.chunk.metadata.caseNo).toContain("111 年度台上字第 150 號");
      expect(top.keywordScore).toBeGreaterThan(1);
    });

    it("should filter by court or sys correctly", async () => {
      const results = await judgmentKb.searchHybrid("詐欺 取財", 3, { sys: "民事" });
      // "110-ts-339" is criminal (刑事), so it should NOT be returned when filtering for 民事
      const criminalChunks = results.filter(r => r.chunk.metadata.sys === "刑事");
      expect(criminalChunks.length).toBe(0);
    });
  });

  describe("Integration with LegalRetrievalService", () => {
    it("should merge statutes and judgments when falling back to local index", async () => {
      // Mock fetch to simulate external failure
      const mockFetchDisabled: typeof fetch = async () => {
        return new Response(JSON.stringify({ enabled: false, provider: "unavailable" }), { status: 200 });
      };

      const retrievalService = new LegalRetrievalService(mockFetchDisabled, defaultLocalKnowledgeBase, judgmentKb);
      
      const context = await retrievalService.retrieveContext("車禍 損害賠償 修理費用 折舊");
      
      expect(context.isExternalRetrievalUsed).toBe(false);
      expect(context.statusMessage).toContain("Phase 3 & 4 Local Index");
      expect(context.hasCitations).toBe(true);
      
      // Ensure prompt block contains statutes and judgments
      expect(context.promptBlock).toContain("適用法規條文");
      expect(context.promptBlock).toContain("相關實務判決節錄");
      
      // Ensure allowed citations contain both statutes (e.g. 民法第184條) and judgments
      expect(context.allowedCitations).toContain("民法第184條");
      expect(context.allowedCitations).toContain("最高法院 112 年度台上字第 9 號民事判決");
    });
  });
});
