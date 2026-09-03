import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import fetchUrlRouter from "./fetchUrl.js";

describe("Fetch URL API (/api/fetch-url)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(fetchUrlRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) server.close(() => resolve());
      else resolve();
    });
  });

  it("1. SSRF 阻擋本機與私有 IP", async () => {
    const res = await fetch(`${baseUrl}/api/fetch-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://127.0.0.1:8080/admin" })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("SSRF");
  });

  it("2. 拒絕無效的 url 格式", async () => {
    const res = await fetch(`${baseUrl}/api/fetch-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-valid-url" })
    });
    expect(res.status).toBe(400);
  });
});
