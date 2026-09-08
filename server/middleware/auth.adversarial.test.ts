import { describe, it, expect, vi } from "vitest";
import {
  authenticate,
  createSignedToken,
  validateSecurityConfiguration,
  getJwtSecret,
  verifySignedToken
} from "./auth.js";
import { Request, Response } from "express";

describe("JWT & Auth Adversarial Tests", () => {
  describe("1. Application Startup & Configuration Fail-Closed Validation", () => {
    it("should reject startup in production if secret is missing", () => {
      const env = { NODE_ENV: "production" };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("FATAL_CONFIG");
    });

    it("should reject startup in production if secret is empty or whitespace", () => {
      const env = { NODE_ENV: "production", JWT_SECRET: "   " };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("FATAL_CONFIG");
    });

    it("should reject startup in production if secret is too short (< 32 chars)", () => {
      const env = { NODE_ENV: "production", JWT_SECRET: "short-secret-123456" };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("at least 32 characters");
    });

    it("should reject startup in production if secret uses known insecure fallback", () => {
      const env = {
        NODE_ENV: "production",
        JWT_SECRET: "development-only-fallback-secret-key-at-least-32-chars"
      };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("forbidden in production");
    });

    it("should accept startup in production with valid >= 32 chars custom secret", () => {
      const env = {
        NODE_ENV: "production",
        JWT_SECRET: "a-very-strong-production-secret-key-that-exceeds-32-chars!"
      };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("should allow development without secret, using dev fallback without crashing", () => {
      const env = { NODE_ENV: "development" };
      const res = validateSecurityConfiguration(env as any);
      expect(res.valid).toBe(true);

      const secret = getJwtSecret(env as any);
      expect(secret).toBe("development-only-fallback-secret-key-at-least-32-chars");
    });

    it("should use explicitly defined secret in development if provided", () => {
      const env = { NODE_ENV: "development", JWT_SECRET: "custom-dev-secret" };
      const secret = getJwtSecret(env as any);
      expect(secret).toBe("custom-dev-secret");
    });

    it("should throw a catchable Error in production getJwtSecret instead of calling process.exit(1)", () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
      const env = { NODE_ENV: "production", JWT_SECRET: "" };

      expect(() => getJwtSecret(env as any)).toThrow("PRODUCTION_AUTH_CONFIG_ERROR");
      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });

  describe("2. JWT Signature & Claims Fail-Closed Adversarial Checks", () => {
    const testSecret = "test-secret-key-with-sufficient-length-for-hmac256-signature";

    it("should block forged JWT with wrong signature", async () => {
      const validToken = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, testSecret);
      const [header, payload] = validToken.split(".");
      
      const forgedToken = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, "wrong-secret-signature-key-12345");
      const [, , fSig] = forgedToken.split(".");
      
      const maliciousToken = `${header}.${payload}.${fSig}`;

      const req = {
        headers: { authorization: `Bearer ${maliciousToken}` },
        ip: "127.0.0.1",
        socket: {}
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      const next = vi.fn();
      const middleware = authenticate({ required: true });
      middleware(req, res, next);
        
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_CREDENTIALS" }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it("should block expired JWT (fail-closed on exp)", async () => {
      const token = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, testSecret, -10);
      const req = {
        headers: { authorization: `Bearer ${token}` },
        ip: "127.0.0.1",
        socket: {}
      } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      const middleware = authenticate({ required: true });
      middleware(req, res, next);
        
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should block token with missing or non-positive exp (strictly fail-closed)", () => {
      // Create token with missing exp
      const rawPayload = { sub: "test1", tenantId: "tenant1", role: "client" as const, exp: 0 };
      const token = createSignedToken(rawPayload, testSecret);
      const verified = verifySignedToken(token, testSecret);
      expect(verified).toBeNull();
    });
    
    it("should block invalid algorithm (e.g. alg: none attack)", async () => {
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64").replace(/=/g, "");
      const payload = Buffer.from(JSON.stringify({ sub: "test1", tenantId: "tenant1", role: "client", exp: Math.floor(Date.now()/1000) + 3600 })).toString("base64").replace(/=/g, "");
      const maliciousToken = `${header}.${payload}.`;
      
      const req = { headers: { authorization: `Bearer ${maliciousToken}` } } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      const middleware = authenticate({ required: true });
      middleware(req, res, next);
        
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
    
    it("should block missing tenantId in payload", async () => {
      const token = createSignedToken({ sub: "test1", role: "client" } as any, testSecret);
      const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      const middleware = authenticate({ required: true });
      middleware(req, res, next);
        
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should block missing sub in payload", () => {
      const token = createSignedToken({ tenantId: "tenant1", role: "client" } as any, testSecret);
      const verified = verifySignedToken(token, testSecret);
      expect(verified).toBeNull();
    });

    it("should block illegal role in payload", () => {
      const token = createSignedToken({ sub: "user1", tenantId: "tenant1", role: "superuser" } as any, testSecret);
      const verified = verifySignedToken(token, testSecret);
      expect(verified).toBeNull();
    });

    it("should block malformed token formats (not 3 segments)", () => {
      expect(verifySignedToken("only-one-part", testSecret)).toBeNull();
      expect(verifySignedToken("part1.part2", testSecret)).toBeNull();
      expect(verifySignedToken("part1.part2.part3.part4", testSecret)).toBeNull();
    });
  });
});
