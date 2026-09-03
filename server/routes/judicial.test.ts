import { vi } from 'vitest';
vi.mock('../../src/lib/twLegalRagClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchLegalSources: vi.fn().mockResolvedValue({ enabled: false, statutes: [], judgments: [], references: [] })
  };
});
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import judicialRouter from "./judicial.js";

describe("Judicial Precedent Search RAG API (/api/judicial/search-precedents)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
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
    expect(body.provider).toBe("local-index");

    // Strictly ensure no legacy hallucinated fallback judgments exist
    const rawText = JSON.stringify(body);
    expect(rawText).not.toContain("108年度台上字第1520號");
    expect(rawText).not.toContain("107年度台上字第2345號");
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
    expect(body.provider).toBe("local-index");

    for (const item of body.precedents) {
      expect(item.caseNumber).toBeDefined();
      expect(item.courtName).toBeDefined();
      expect(item.summary).toBeDefined();
      expect(item.relevance).toBeDefined();
      expect(item.keyTakeaway).toBeDefined();
      expect(item.sourceUrl).toBeDefined();
      expect(item.sourceUrl).toContain("judgment.judicial.gov.tw");
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
    expect(body.provider).toBe("local-index");
    expect(body.precedents[0].sourceUrl).toContain("judgment.judicial.gov.tw");
  });
});
