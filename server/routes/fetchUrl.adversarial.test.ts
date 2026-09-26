// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import { Readable } from "node:stream";
import fetchUrlRouter, {
  createPinnedRequestOptions,
  isBasicSafeUrl,
  readBodyWithLimit,
  requestPinnedUrl,
  isPrivateIp,
} from "./fetchUrl.js";

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

  it("blocks NAT64, 6to4, and Teredo IPv6 transition addresses", () => {
    expect(isPrivateIp("64:ff9b::7f00:1")).toBe(true);
    expect(isPrivateIp("2002:7f00:1::")).toBe(true);
    expect(isPrivateIp("2001:0:7f00:1::")).toBe(true);
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

  describe("Pinned DNS and bounded response body", () => {
    it("connects to the verified IP while preserving the original Host header", async () => {
      let receivedHost = "";
      const server = http.createServer((req, res) => {
        receivedHost = req.headers.host || "";
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("pinned response");
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

      try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");
        const target = new URL(`http://rebind.invalid:${address.port}/judgment`);
        const controller = new AbortController();
        const response = await requestPinnedUrl(target, "127.0.0.1", controller.signal);

        expect(await readBodyWithLimit(response, controller.signal)).toBe("pinned response");
        expect(receivedHost).toBe(`rebind.invalid:${address.port}`);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("keeps hostname as HTTPS SNI without using it as the connection address", () => {
      const target = new URL("https://rebind.invalid/judgment");
      const options = createPinnedRequestOptions(target, "93.184.216.34");

      expect(options.hostname).toBe("93.184.216.34");
      expect(options.servername).toBe("rebind.invalid");
      expect((options.headers as Record<string, string>).Host).toBe("rebind.invalid");
    });

    it("destroys an actual chunked response as soon as its UTF-8 byte count exceeds 2 MiB", async () => {
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.write(Buffer.alloc(2 * 1024 * 1024));
        res.end(Buffer.from("界"));
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

      try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");
        const controller = new AbortController();
        const response = await requestPinnedUrl(
          new URL(`http://oversized.invalid:${address.port}`),
          "127.0.0.1",
          controller.signal,
        );

        await expect(readBodyWithLimit(response, controller.signal)).rejects.toThrow("目標網頁內容超過 2MB 限制");
        expect(response.destroyed).toBe(true);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("aborts a stalled response body when the deadline signal fires", async () => {
      const response = new Readable({ read() {} });
      const controller = new AbortController();
      const pending = readBodyWithLimit(response, controller.signal);

      controller.abort();

      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
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
