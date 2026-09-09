import { describe, expect, it, vi } from "vitest";
import { verifyOfficialCitations } from "./officialCitationVerification.js";

const html = (body: string, init?: ResponseInit) => new Response(body, {
  status: 200,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  ...init
});

describe("official citation verification", () => {
  it("以法務部條文頁逐筆確認法規", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(html(`
      <html><body><h1>民法</h1><div class="col-no">第 184 條</div>
      <div>因故意或過失，不法侵害他人之權利者，負損害賠償責任。</div></body></html>
    `));

    const result = await verifyOfficialCitations(["民法第184條"], { fetchImpl: fetchImpl as typeof fetch });

    expect(result.allVerified).toBe(true);
    expect(result.evidence[0]).toMatchObject({
      status: "VERIFIED",
      source: "全國法規資料庫",
      matchStrategy: "OFFICIAL_ARTICLE_PAGE"
    });
    expect(result.evidence[0].sourceUrl).toBe("https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=184");
    expect(result.evidence[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchImpl).toHaveBeenCalledWith(result.evidence[0].sourceUrl, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("透過司法院查詢流程精確比對案號並讀取裁判頁", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(html(`
        <form><input type="hidden" name="__VIEWSTATE" value="state" />
        <input type="hidden" name="__EVENTVALIDATION" value="event" /></form>
      `, { headers: { "Set-Cookie": "ASP.NET_SessionId=session; Path=/; HttpOnly" } }))
      .mockResolvedValueOnce(html(`<a href="qryresultlst.aspx?ty=JUDBOOK&q=query-id">查詢結果 1</a>`, {
        headers: { "Set-Cookie": "QC_JUDBOOK=query; Path=/; HttpOnly" }
      }))
      .mockResolvedValueOnce(html(`
        <a href="data.aspx?ty=JD&id=case-id">最高法院 112 年度台上字第 9 號民事判決</a>
      `))
      .mockResolvedValueOnce(html(`
        <article>最高法院 112 年度台上字第 9 號民事判決 主文 上訴駁回。</article>
      `));

    const result = await verifyOfficialCitations([
      { citation: "最高法院112年度台上字第9號", type: "PRECEDENT", claim: "最高法院112年度台上字第9號民事判決主文上訴駁回" }
    ], { fetchImpl: fetchImpl as typeof fetch });

    expect(result.allVerified).toBe(true);
    expect(result.evidence[0]).toMatchObject({
      status: "VERIFIED",
      source: "司法院裁判書系統",
      matchStrategy: "OFFICIAL_SEARCH_AND_DOCUMENT_EXACT_CASE_NUMBER",
      claimSupportStatus: "SUPPORTED"
    });
    expect(result.evidence[0].sourceUrl).toBe("https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=case-id");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("官方頁面沒有指定條文時回傳查無資料", async () => {
    const result = await verifyOfficialCitations(["民法第999條"], {
      fetchImpl: vi.fn().mockResolvedValue(html("<html><body><h1>民法</h1><p>查無資料</p></body></html>")) as typeof fetch
    });

    expect(result.allVerified).toBe(false);
    expect(result.evidence[0].status).toBe("NOT_FOUND");
  });

  it("引用存在但主張未受官方內容支持時維持待審", async () => {
    const result = await verifyOfficialCitations([
      { citation: "民法第184條", type: "STATUTE", claim: "雇主得不附理由隨時解僱任何勞工且無須預告" }
    ], {
      fetchImpl: vi.fn().mockResolvedValue(html(`
        <html><body><h1>民法</h1><div>第 184 條</div>
        <div>因故意或過失，不法侵害他人之權利者，負損害賠償責任。</div></body></html>
      `)) as typeof fetch
    });

    expect(result.evidence[0]).toMatchObject({ status: "VERIFIED", claimSupportStatus: "NEEDS_REVIEW" });
    expect(result.allVerified).toBe(false);
  });

  it("無法解析官方條文路由時 fail-closed 且不送出猜測查詢", async () => {
    const fetchImpl = vi.fn();
    const result = await verifyOfficialCitations(["不存在法第999條"], { fetchImpl: fetchImpl as typeof fetch });

    expect(result.allVerified).toBe(false);
    expect(result.evidence[0]).toMatchObject({ status: "UNAVAILABLE", error: "OFFICIAL_ROUTE_UNRESOLVED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("官方服務失敗時 fail-closed", async () => {
    const result = await verifyOfficialCitations(["民法第184條"], {
      fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) as typeof fetch
    });

    expect(result.allVerified).toBe(false);
    expect(result.evidence[0].status).toBe("UNAVAILABLE");
    expect(result.evidence[0].error).toBe("FETCH_FAILED");
  });
});
