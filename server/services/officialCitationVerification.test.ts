import { describe, expect, it, vi } from "vitest";
import { verifyOfficialCitations } from "./officialCitationVerification.js";

const response = (ok:boolean, body:string, status=200) => ({ ok, status, text: async () => body } as Response);

describe("official citation verification", () => {
  it("官方查詢成功", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(true, "民法第184條"));
    const result = await verifyOfficialCitations(["民法第184條"], { fetchImpl: fetchImpl as any });
    expect(result.allVerified).toBe(true); expect(result.evidence[0].status).toBe("VERIFIED");
  });
  it("查無資料", async () => {
    const result = await verifyOfficialCitations(["不存在法第999條"], { fetchImpl: vi.fn().mockResolvedValue(response(true, "查無資料")) as any });
    expect(result.allVerified).toBe(false); expect(result.evidence[0].status).toBe("NOT_FOUND");
  });
  it("服務失敗", async () => {
    const result = await verifyOfficialCitations(["民法第184條"], { fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) as any });
    expect(result.allVerified).toBe(false); expect(result.evidence[0].status).toBe("UNAVAILABLE");
  });
});
