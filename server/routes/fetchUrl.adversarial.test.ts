// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import fetchUrlRouter, { isBasicSafeUrl, isPrivateIp, verifyDnsSafe } from "./fetchUrl.js";

describe("SSRF Second-Layer Adversarial Tests (Phase B)", () => {
  let targetServer: http.Server;
  let targetBaseUrl: string;
  let appServer: http.Server;
  let appBaseUrl: string;

  beforeAll(async () => {
    // 1. 建立受測 API 伺服器
    const app = express();
    app.use(express.json());
    app.use(fetchUrlRouter);

    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const addr = appServer.address();
        if (addr && typeof addr === "object") {
          appBaseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    // 2. 建立模擬外部伺服器 (用於測試惡意重導向)
    const mockExternalApp = express();
    // 惡意重導向至 127.0.0.1
    mockExternalApp.get("/redirect-to-localhost", (req, res) => {
      res.redirect(302, `${appBaseUrl}/api/sensitive-internal`);
    });
    // 惡意重導向至 AWS Metadata
    mockExternalApp.get("/redirect-to-metadata", (req, res) => {
      res.redirect(302, "http://169.254.169.254/latest/meta-data/");
    });
    // 無窮重導向迴圈
    mockExternalApp.get("/infinite-redirect-1", (req, res) => {
      res.redirect(302, `${targetBaseUrl}/infinite-redirect-2`);
    });
    mockExternalApp.get("/infinite-redirect-2", (req, res) => {
      res.redirect(302, `${targetBaseUrl}/infinite-redirect-1`);
    });
    // 合法外部回應
    mockExternalApp.get("/legit-page", (req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send("<html><head><title>合法裁判書公告</title></head><body>最高法院 112 年度台上字第 123 號民事判決判決理由主文...</body></html>");
    });

    await new Promise<void>((resolve) => {
      targetServer = mockExternalApp.listen(0, () => {
        const addr = targetServer.address();
        if (addr && typeof addr === "object") {
          targetBaseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (appServer) await new Promise<void>((resolve) => appServer.close(() => resolve()));
    if (targetServer) await new Promise<void>((resolve) => targetServer.close(() => resolve()));
  });

  describe("Direct Localhost & Private IP Blocking", () => {
    const blockedUrls = [
      "http://localhost:3000/api/secret",
      "http://localhost./api/secret",
      "http://127.0.0.1:8080/metrics",
      "http://0.0.0.0:3000",
      "http://[::1]:8080",
      "http://[::ffff:127.0.0.1]:8080",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/admin",
      "http://192.168.1.1/router",
      "http://172.16.0.1/intranet",
      "http://2130706433:80", // 127.0.0.1 integer decimal
      "http://0x7f000001:80", // 127.0.0.1 hex
      "file:///etc/passwd",
      "gopher://127.0.0.1:25",
      "ftp://127.0.0.1/secret.txt"
    ];

    for (const testUrl of blockedUrls) {
      it(`blocks SSRF attempt to ${testUrl}`, async () => {
        const res = await fetch(`${appBaseUrl}/api/fetch-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: testUrl })
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("SSRF_BLOCKED");
      });
    }
  });

  describe("Adversarial Redirect Chains (Second-Layer Validation)", () => {
    it("blocks when external URL redirects to internal localhost target", async () => {
      const res = await fetch(`${appBaseUrl}/api/fetch-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${targetBaseUrl}/redirect-to-localhost` })
      });

      // 伺服器在追蹤重導向時必須驗證 Location 並阻擋
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("SSRF_BLOCKED");
    });

    it("blocks when external URL redirects to cloud metadata IP", async () => {
      const res = await fetch(`${appBaseUrl}/api/fetch-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${targetBaseUrl}/redirect-to-metadata` })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("SSRF_BLOCKED");
    });

    it("prevents infinite redirect loops", async () => {
      const res = await fetch(`${appBaseUrl}/api/fetch-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${targetBaseUrl}/infinite-redirect-1` })
      });

      // 預期因為超過 MAX_REDIRECTS 被拒絕
      expect([400, 502]).toContain(res.status);
    });
  });

  describe("Hostname Normalization & Octal Parsing Edge Cases", () => {
    it("recognizes trailing dot FQDN as localhost and blocks it", () => {
      const check = isBasicSafeUrl("http://localhost./");
      expect(check.safe).toBe(false);
    });

    it("recognizes octal IP representation in isPrivateIPv4 or basic url check", () => {
      const check = isBasicSafeUrl("http://0177.0.0.1/");
      // 0177.0.0.1 帶前導 0 應被視為高風險非標準格式或私有 IP
      expect(check.safe).toBe(false);
    });
  });
});
