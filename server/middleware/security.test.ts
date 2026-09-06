import { describe, it, expect } from "vitest";
import { sanitizeValue } from "./security.js";
import { verifyTenantOwnership, TenantContext } from "./tenantScope.js";
import type { Request } from "express";

describe("Security Middleware - sanitizeValue", () => {
  it("preserves spaces, legal Chinese text, punctuation and newlines", () => {
    const legalText = "民事起訴狀\n原告：張三\t被告：李四  股份有限公司\n訴訟標的金額：新臺幣 1,000,000 元整。";
    const cleaned = sanitizeValue(legalText);
    expect(cleaned).toBe(legalText);
  });

  it("does not reject or corrupt legal text mentioning javascript syntax in contract disputes", () => {
    const contractText = "系爭軟體第 4 條約定：若點擊按鈕執行 javascript: calculateTotal() 產生溢領金額，乙方應負連帶責任。";
    const cleaned = sanitizeValue(contractText);
    expect(cleaned).toBe(contractText);
  });

  it("strips harmful script tags while keeping text safe", () => {
    const dirty = "起訴事實：<script>alert('XSS')</script>被告於民國 112 年借款未還。";
    const cleaned = sanitizeValue(dirty);
    expect(cleaned).toBe("起訴事實：被告於民國 112 年借款未還。");
  });

  it("removes non-printable ASCII control characters but keeps tabs and newlines", () => {
    const dirty = "標的\x00\x08金額\x1F：\t100\n元\x7F";
    const cleaned = sanitizeValue(dirty);
    expect(cleaned).toBe("標的金額：\t100\n元");
  });

  it("recursively sanitizes nested objects and arrays", () => {
    const payload = {
      caseTitle: "返還借款\x00事件",
      parties: [
        { name: "王五\x07", role: "原告" },
        { name: "<script>hack()</script>趙六", role: "被告" }
      ],
      details: {
        amount: 50000,
        notes: "附表一\t說明"
      }
    };
    const sanitized = sanitizeValue(payload) as any;
    expect(sanitized.caseTitle).toBe("返還借款事件");
    expect(sanitized.parties[0].name).toBe("王五");
    expect(sanitized.parties[1].name).toBe("趙六");
    expect(sanitized.details.notes).toBe("附表一\t說明");
    expect(sanitized.details.amount).toBe(50000);
  });
});

describe("Tenant Scope & Multi-User Isolation", () => {
  it("allows access when tenant matches", () => {
    const mockReq = {
      tenantContext: {
        tenantId: "firm-alpha",
        userId: "lawyer-1",
        role: "lawyer",
        isSystemAdmin: false,
      } as TenantContext
    } as Request;

    const resource = { tenantId: "firm-alpha", userId: "client-99" };
    const result = verifyTenantOwnership(mockReq, resource);
    expect(result.allowed).toBe(true);
  });

  it("denies access when tenant does not match", () => {
    const mockReq = {
      tenantContext: {
        tenantId: "firm-alpha",
        userId: "lawyer-1",
        role: "lawyer",
        isSystemAdmin: false,
      } as TenantContext
    } as Request;

    const resource = { tenantId: "firm-beta", userId: "client-99" };
    const result = verifyTenantOwnership(mockReq, resource);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("禁止跨租戶存取");
  });

  it("restricts client role to their own user resources even within same tenant", () => {
    const mockReq = {
      tenantContext: {
        tenantId: "firm-alpha",
        userId: "client-1",
        role: "client",
        isSystemAdmin: false,
      } as TenantContext
    } as Request;

    const ownResource = { tenantId: "firm-alpha", userId: "client-1" };
    expect(verifyTenantOwnership(mockReq, ownResource).allowed).toBe(true);

    const otherClientResource = { tenantId: "firm-alpha", userId: "client-2" };
    const deniedResult = verifyTenantOwnership(mockReq, otherClientResource);
    expect(deniedResult.allowed).toBe(false);
    expect(deniedResult.reason).toContain("無權存取其他當事人");
  });

  it("permits system admin to access resources across tenants", () => {
    const mockReq = {
      tenantContext: {
        tenantId: "sys-tenant",
        userId: "admin-root",
        role: "admin",
        isSystemAdmin: true,
      } as TenantContext
    } as Request;

    const resource = { tenantId: "firm-beta", userId: "client-2" };
    expect(verifyTenantOwnership(mockReq, resource).allowed).toBe(true);
  });
});
