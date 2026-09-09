import { describe, it, expect, vi } from "vitest";
import { sanitizeValue, safeLogError } from "./security.js";
import { verifyTenantOwnership, tenantScopeMiddleware, TenantContext } from "./tenantScope.js";
import { authenticate, createSignedToken, verifySignedToken, requestIdMiddleware } from "./auth.js";
import { AuditLogService } from "../services/auditLog.js";
import type { Request, Response } from "express";

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

describe("Authentication & Token Verification (防偽認證)", () => {
  it("generates and verifies genuine HMAC signed JWT tokens", () => {
    const token = createSignedToken({
      sub: "usr_lawyer_001",
      tenantId: "firm_abc",
      role: "lawyer",
      name: "王大明律師"
    });

    const verified = verifySignedToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("usr_lawyer_001");
    expect(verified?.tenantId).toBe("firm_abc");
    expect(verified?.role).toBe("lawyer");
  });

  it("rejects forged, tampered or arbitrary tokens with 401 (not pseudo-authenticated)", () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => {
            jsonBody = body;
          }
        };
      }
    } as unknown as Response;

    const mockReq = {
      headers: { authorization: "Bearer arbitrary_fake_token_12345" },
      ip: "127.0.0.1"
    } as unknown as Request;

    const nextFn = vi.fn();
    authenticate({ required: false })(mockReq, mockRes, nextFn);

    expect(statusCode).toBe(401);
    expect(jsonBody?.code).toBe("INVALID_CREDENTIALS");
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("rejects expired tokens", () => {
    const expiredToken = createSignedToken(
      { sub: "usr_expired", tenantId: "t1", role: "lawyer" },
      undefined,
      -100 // 已經過期
    );

    const verified = verifySignedToken(expiredToken);
    expect(verified).toBeNull();
  });
});

describe("Header Spoofing Prevention (防偽造租戶與使用者)", () => {
  it("ignores spoofed X-Tenant-Id and X-User-Id from unauthenticated client requests", () => {
    const mockReq = {
      headers: {
        "x-tenant-id": "victim-tenant-corp",
        "x-user-id": "victim-admin-user"
      },
      ip: "127.0.0.1"
    } as unknown as Request;

    const mockRes = {} as Response;
    const nextFn = vi.fn();

    // 1. authenticate 指派固定沙盒身分
    authenticate({ required: false })(mockReq, mockRes, nextFn);
    expect(mockReq.user?.tenantId).toBe("sandbox-tenant");
    expect(mockReq.user?.id).not.toBe("victim-admin-user");

    // 2. tenantScopeMiddleware 鎖定租戶上下文
    tenantScopeMiddleware(mockReq, mockRes, nextFn);
    expect(mockReq.tenantContext?.tenantId).toBe("sandbox-tenant");
    expect(mockReq.tenantContext?.userId).not.toBe("victim-admin-user");
  });

  it("prevents authenticated normal users from accessing other tenant resources", () => {
    const mockReq = {
      tenantContext: {
        tenantId: "firm-alpha",
        userId: "lawyer-1",
        role: "lawyer",
        isSystemAdmin: false
      } as TenantContext
    } as Request;

    const victimResource = { tenantId: "firm-victim", userId: "lawyer-99" };
    const check = verifyTenantOwnership(mockReq, victimResource);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("禁止跨租戶存取");
  });
});

describe("Request ID & Error Logging Sanitization", () => {
  it("sanitizes invalid or oversized request IDs and generates UUID", () => {
    const mockReq = {
      headers: { "x-request-id": "bad;drop table;-- <script>" },
      startTime: 0
    } as any;
    const setHeaderSpy = vi.fn();
    const mockRes = { setHeader: setHeaderSpy, on: vi.fn() } as any;

    requestIdMiddleware(mockReq, mockRes, () => {});

    expect(mockReq.id).toMatch(/^req_[0-9a-fA-F-]{36}$/);
    expect(setHeaderSpy).toHaveBeenCalledWith("X-Request-Id", mockReq.id);
  });

  it("safeLogError removes bearer tokens, API keys, and personal info from log output", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sensitiveErr = new Error("連線失敗，憑證為 Bearer eyJhbGciOiJIUz...，密鑰 apiKey=AIzaSyA_secretKey，當事人身分證 A123456789");

    safeLogError("TestContext", sensitiveErr);

    expect(consoleSpy).toHaveBeenCalled();
    const loggedStr = consoleSpy.mock.calls[0].join(" ");
    expect(loggedStr).not.toContain("A123456789");
    expect(loggedStr).not.toContain("AIzaSyA_secretKey");
    expect(loggedStr).toContain("REDACTED");
    consoleSpy.mockRestore();
  });
});

describe("AuditLogService Persistence", () => {
  it("reports isolated non-durable persistence in the test environment", () => {
    expect(AuditLogService.getPersistenceStatus()).toMatchObject({ mode: "sqlite", durable: false });
  });

  it("records audit events with sanitized tenant and retrieves them", () => {
    const testTenant = `tenant_${Date.now()}`;
    AuditLogService.log({
      requestId: "req_test_123",
      tenantId: testTenant,
      userId: "usr_test_1",
      action: "POST /api/test",
      resource: "/api/test",
      status: "SUCCESS",
      statusCode: 200,
      durationMs: 15,
      ip: "127.0.0.1",
      metadata: { sensitiveId: "A123456789" }
    });

    const result = AuditLogService.getLogsByTenant(testTenant);
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.logs[0].tenantId).toBe(testTenant);
    expect(result.logs[0].metadata?.sensitiveId).toBe("A1*****89");
  });
});
