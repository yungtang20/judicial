// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import http from "node:http";
import express from "express";
vi.mock("../services/officialCitationVerification.js", () => ({ searchOfficialJudgments: vi.fn() }));
import judicialRouter from "./judicial.js";
import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { searchOfficialJudgments } from "../services/officialCitationVerification.js";

describe("Judicial Precedent Search RAG API (/api/judicial/search-precedents)", { timeout: 30000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.mocked(defaultAIProvider.generate).mockResolvedValue({
      text: JSON.stringify({ precedents: [], searchKeywords: [], provider: "local-index" })
    } as any);
    const app = express();
    app.use(express.json());
    app.use(judicialRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === "object") {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    vi.mocked(searchOfficialJudgments).mockImplementation(async (query: string) => {
      const checkedAt = "2026-09-10T03:00:00.000Z";
      const base = {
        attempted: true,
        query,
        source: "司法院裁判書系統" as const,
        sourceUrl: "https://judgment.judicial.gov.tw/FJUD/qryresultlst.aspx?q=test",
        checkedAt
      };
      if (query.includes("qqwwxxzz")) return { ...base, status: "NOT_FOUND", results: [] };
      const loanQuery = query.includes("消費借貸");
      const caseNumber = loanQuery
        ? "最高法院 98 年度台上字第 1045 號民事判決"
        : "最高法院 26 年渝上字第 805 號民事判例";
      return {
        ...base,
        status: "VERIFIED",
        results: [{
          caseNumber,
          courtName: "最高法院",
          summary: loanQuery ? "消費借貸之成立須有金錢交付與借貸合意。" : "時效完成後承認債務之法律效果。",
          sourceUrl: `https://judgment.judicial.gov.tw/FJUD/data.aspx?id=${loanQuery ? "98-1045" : "26-805"}`,
          checkedAt,
          contentHash: "a".repeat(64)
        }]
      };
    });
  });

  it("returns 400 Bad Request when query is empty or missing", async () => {
    const res = await fetch(`${baseUrl}/api/judicial/search-precedents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("請提供查詢關鍵字或案件事實");
  });

  it("returns empty precedents without hallucination when no matches found", async () => {
    // A completely unrelated query that should not match any Taiwan legal precedent
    const res = await fetch(`${baseUrl}/api/judicial/search-precedents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "qqwwxxzz998877noexistent_token_abc" })
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.precedents).toEqual([]);
    expect(body.notice).toContain("查無相關實務見解");
    expect(body.provider).toBe("judicial-official");
    expect(body.officialSearch.status).toBe("NOT_FOUND");

    // Strictly ensure no legacy hallucinated fallback judgments exist
    const rawText = JSON.stringify(body);
    expect(rawText).not.toContain("108年度台上字第1520號");
    expect(rawText).not.toContain("107年度台上字第2345號");
  });

  it("官方服務失敗時回傳空結果與 UNAVAILABLE，不得使用靜態假裁判", async () => {
    vi.mocked(searchOfficialJudgments).mockResolvedValueOnce({
      results: [],
      status: "UNAVAILABLE",
      attempted: true,
      query: "租賃押金",
      source: "司法院裁判書系統",
      sourceUrl: "https://judgment.judicial.gov.tw/FJUD/default.aspx",
      checkedAt: "2026-09-10T03:00:00.000Z",
      error: "TIMEOUT"
    });

    const res = await fetch(`${baseUrl}/api/judicial/search-precedents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "租賃押金" })
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.precedents).toEqual([]);
    expect(body.officialSearch).toMatchObject({ status: "UNAVAILABLE", error: "TIMEOUT" });
    expect(body.notice).toContain("安全停止");
  });

  it("retrieves real precedents with sourceUrl for valid legal queries", async () => {
    const res = await fetch(`${baseUrl}/api/judicial/search-precedents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "消費借貸 合意 金錢交付 舉證責任",
        caseType: "民事訴訟"
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.precedents)).toBe(true);
    expect(body.precedents.length).toBeGreaterThan(0);
    expect(body.provider).toBe("judicial-official");

    for (const item of body.precedents) {
      expect(item.caseNumber).toBeDefined();
      expect(item.courtName).toBeDefined();
      expect(item.summary).toBeDefined();
      expect(item.relevance).toBeDefined();
      expect(item.keyTakeaway).toBeDefined();
      expect(item.sourceUrl).toBeDefined();
      expect(item.sourceUrl).toContain("judgment.judicial.gov.tw");
      expect(item.checkedAt).toBeDefined();
      expect(item.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(item.verificationStatus).toBe("VERIFIED");
    }

    // Must match the real 98 Supreme Court loan precedent in the seed database
    const citations = body.precedents.map((p: any) => p.caseNumber).join(" ");
    expect(citations).toContain("98");
  });

  it("supports the alias endpoint /api/search-precedents with identical contracts", async () => {
    const res = await fetch(`${baseUrl}/api/search-precedents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: "時效完成 承認 拋棄時效利益",
        categoryName: "民事訴訟"
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.precedents.length).toBeGreaterThan(0);
    expect(body.provider).toBe("judicial-official");
    expect(body.precedents[0].sourceUrl).toContain("judgment.judicial.gov.tw");
  });
});
