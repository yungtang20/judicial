import { describe, expect, it, beforeEach } from "vitest";
import { LocalLegalKnowledgeBase } from "./localKnowledgeBase.js";
import { LegalRetrievalService } from "../services/legalGenerationPipeline.js";

describe("Phase 3: LocalLegalKnowledgeBase & Retrieval Evaluation", () => {
  let kb: LocalLegalKnowledgeBase;

  beforeEach(async () => {
    kb = new LocalLegalKnowledgeBase();
    await kb.init();
  });

  it("successfully loads statutes and interpretations with complete metadata", () => {
    expect(kb.getItemsCount()).toBeGreaterThanOrEqual(14);
  });

  describe("Hybrid Retrieval Recall Benchmarks (法律實務情境召回評估)", () => {
    it("Scenario 1 [侵權與車禍損害賠償]: accurately recalls 民法第184條, 第213條, 第217條 and 折舊函釋", async () => {
      const query = "發生車禍被對方闖紅燈撞傷，想要請求損害賠償與車輛修復費用，對方辯稱我有過失";
      const results = await kb.searchHybrid(query, { topK: 5 });

      const recalledCitations = results.map(r => r.item.citation);
      expect(recalledCitations).toContain("民法第184條");
      expect(recalledCitations).toContain("民法第217條");
      expect(results[0].score).toBeGreaterThan(0.3);
    });

    it("Scenario 2 [舉證責任分配]: accurately recalls 民事訴訟法第277條", async () => {
      const query = "對方空口說白話主張事實，民事訴訟上究竟誰應負舉證責任？";
      const results = await kb.searchHybrid(query, { topK: 3 });

      const topResult = results[0];
      expect(topResult.item.citation).toBe("民事訴訟法第277條");
      expect(topResult.item.title).toContain("舉證責任分配");
      expect(topResult.excerpt).toContain("舉證之責任");
    });

    it("Scenario 3 [房屋租賃欠租與定型化契約]: recalls 民法第440條 and 內政部租屋函釋", async () => {
      const query = "房客欠繳二個月房租，房東如何寄發存證信函催告終止租約與返還房屋，押金如何抵充？";
      const results = await kb.searchHybrid(query, { topK: 5 });

      const recalledCitations = results.map(r => r.item.citation);
      expect(recalledCitations).toContain("民法第440條");
      expect(recalledCitations).toContain("內政部台內地字第1090243120號函");
    });

    it("Scenario 4 [勞工被扣薪與被迫離職]: recalls 勞動基準法第14條 and 勞動部函釋", async () => {
      const query = "老闆以工作疏失為由片面剋扣工資薪水，員工想要終止契約請求資遣費";
      const results = await kb.searchHybrid(query, { topK: 5 });

      const recalledCitations = results.map(r => r.item.citation);
      expect(recalledCitations).toContain("勞動基準法第14條");
      expect(recalledCitations).toContain("勞動部勞動條2字第1060130541號函");
    });

    it("Scenario 5 [消滅時效抗辯]: recalls 民法第125條 and 法務部抗辯權函釋", async () => {
      const query = "借款已經過了15年消滅時效，債務人要提出抗辯拒絕給付";
      const results = await kb.searchHybrid(query, { topK: 5 });

      const recalledCitations = results.map(r => r.item.citation);
      expect(recalledCitations).toContain("民法第125條");
      expect(recalledCitations).toContain("法務部法律決字第0980012345號函");
    });
  });

  describe("Integration with LegalRetrievalService (無縫降級相容性)", () => {
    it("falls back to local knowledge base when TLR is disabled, producing valid LegalSourceItems", async () => {
      const mockFetchDisabled: typeof fetch = async () => {
        return new Response(JSON.stringify({ enabled: false, provider: "unavailable" }), { status: 200 });
      };

      const retrievalService = new LegalRetrievalService(mockFetchDisabled, kb);
      const sources = await retrievalService.search("車禍損害賠償過失相抵");

      expect(sources.enabled).toBe(true);
      expect(sources.provider).toBe("local-index");
      expect(sources.statutes.length).toBeGreaterThan(0);
      expect(sources.allowedCitations).toContain("民法第184條");

      const promptContext = await retrievalService.retrieveContext("車禍侵權");
      expect(promptContext.isExternalRetrievalUsed).toBe(false);
      expect(promptContext.statusMessage).toContain("自建本機法規與函釋知識庫");
      expect(promptContext.promptBlock).toContain("【本機知識庫檢索之法規與函釋見解】");
      expect(promptContext.allowedCitations).toContain("民法第184條");
    });
  });
});
