import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JudgmentKnowledgeBase } from "./judgmentKnowledgeBase.js";
import { LegalRetrievalService } from "../services/legalGenerationPipeline.js";
import { defaultLocalKnowledgeBase } from "./localKnowledgeBase.js";

const tempDirs: string[] = [];

function createSeedFile(entries: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "judicial-judgment-kb-"));
  tempDirs.push(dir);
  const seedPath = path.join(dir, "judgments.json");
  fs.writeFileSync(seedPath, JSON.stringify(entries), "utf8");
  return seedPath;
}

const verifiedFixture = {
  id: "official-case-fixture",
  judgmentId: "fixture-001",
  metadata: {
    court: "最高法院",
    caseNo: "最高法院 112 年度台上字第 9 號民事判決",
    sys: "民事",
    reason: "設計專利權",
    date: "2023-10-04",
    relatedStatutes: ["專利法第136條"],
    officialVerification: {
      status: "VERIFIED",
      sourceUrl: "https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=fixture",
      checkedAt: "2026-09-08T12:00:00.000Z",
      contentHash: "a".repeat(64)
    }
  },
  section: "理由",
  content: "本件為汽車外觀設計專利權爭議，裁判內容僅作測試資料。"
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("JudgmentKnowledgeBase official evidence gate", () => {
  it("預設種子不含未經逐筆官方驗證的裁判", async () => {
    const judgmentKb = new JudgmentKnowledgeBase();
    await judgmentKb.init();

    expect(await judgmentKb.searchHybrid("損害賠償 折舊 修復費用")).toEqual([]);
    expect((await judgmentKb.retrieveAsSources("租金逾期")).allowedCitations).toEqual([]);
  });

  it("排除缺少官方明細網址、查證時間或內容雜湊的種子", async () => {
    const unverified = structuredClone(verifiedFixture) as any;
    delete unverified.metadata.officialVerification.contentHash;
    const judgmentKb = new JudgmentKnowledgeBase(createSeedFile([unverified]));

    expect(await judgmentKb.searchHybrid("設計專利權")).toEqual([]);
  });

  it("僅允許具完整官方證據的裁判進入 allowed citations", async () => {
    const judgmentKb = new JudgmentKnowledgeBase(createSeedFile([verifiedFixture]));
    const results = await judgmentKb.searchHybrid("設計專利權");
    const sources = await judgmentKb.retrieveAsSources("設計專利權");

    expect(results).toHaveLength(1);
    expect(results[0].chunk.metadata.reason).toBe("設計專利權");
    expect(sources.judgments[0].sourceUrl).toContain("/FJUD/data.aspx");
    expect(sources.allowedCitations).toEqual([verifiedFixture.metadata.caseNo]);
  });

  it("混合檢索保留法規，並只合併有官方證據的裁判", async () => {
    const judgmentKb = new JudgmentKnowledgeBase(createSeedFile([verifiedFixture]));
    const mockFetchDisabled: typeof fetch = async () => new Response(
      JSON.stringify({ enabled: false, provider: "unavailable" }),
      { status: 200 }
    );
    const retrievalService = new LegalRetrievalService(mockFetchDisabled, defaultLocalKnowledgeBase, judgmentKb);

    const context = await retrievalService.retrieveContext("設計專利權 民法第184條");

    expect(context.isExternalRetrievalUsed).toBe(false);
    expect(context.hasCitations).toBe(true);
    expect(context.promptBlock).toContain("適用法規條文");
    expect(context.promptBlock).toContain("相關實務判決節錄");
    expect(context.allowedCitations).toContain(verifiedFixture.metadata.caseNo);
  });
});
