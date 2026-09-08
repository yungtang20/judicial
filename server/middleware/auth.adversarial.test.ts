import { describe, it, expect, vi } from "vitest";
import { authenticate, createSignedToken } from "./auth.js";
import { Request, Response } from "express";

describe("JWT & Auth Adversarial Tests", () => {
  it("should block forged JWT with wrong signature", async () => {
    const validToken = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, "correct-secret");
    const [header, payload, sig] = validToken.split('.');
    
    // Create another token with same payload but different secret
    const forgedToken = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, "wrong-secret");
    const [, , fSig] = forgedToken.split('.');
    
    // Assemble valid header + valid payload + forged signature
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
  
  it("should block expired JWT", async () => {
    const token = createSignedToken({ sub: "test1", tenantId: "tenant1", role: "client" }, "correct-secret", -10);
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
  });
  
  it("should block invalid algorithm (e.g. none)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64").replace(/=/g, "");
    const payload = Buffer.from(JSON.stringify({ sub: "test1", tenantId: "tenant1", role: "client", iat: Math.floor(Date.now()/1000) })).toString("base64").replace(/=/g, "");
    const maliciousToken = `${header}.${payload}.`;
    
    const req = { headers: { authorization: `Bearer ${maliciousToken}` } } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const middleware = authenticate({ required: true });
    middleware(req, res, next);
      
    expect(res.status).toHaveBeenCalledWith(401);
  });
  
  it("should block missing tenantId in payload", async () => {
    const token = createSignedToken({ sub: "test1", role: "client" } as any, "correct-secret");
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const middleware = authenticate({ required: true });
    middleware(req, res, next);
      
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
