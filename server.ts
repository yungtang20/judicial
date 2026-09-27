import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createExpressApp } from "./server/index.js";
import { validateSecurityConfiguration } from "./server/middleware/auth.js";

process.env.DOTENV_CONFIG_QUIET = "true";
const _log = console.log;
const _warn = console.warn;
console.log = () => {};
console.warn = () => {};
dotenv.config({ quiet: true });
console.log = _log;
console.warn = _warn;

// 清理無效的 BASE_URL 金鑰字串
const rawBaseUrl = process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL;
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  console.log(`[Gemini Env] 清理無效的 BASE_URL 字串`);
  delete process.env.GOOGLE_GEMINI_BASE_URL;
  delete process.env.GEMINI_BASE_URL;
}

// 驗證與解析 APP_URL
export function getAppUrl(port: number): string {
  const envUrl = process.env.APP_URL;
  if (envUrl && envUrl.trim() && envUrl !== "MY_APP_URL") {
    try {
      const parsed = new URL(envUrl.trim());
      return parsed.origin;
    } catch {
      console.warn(`[Config Warning] APP_URL "${envUrl}" 格式不合規，自動降級使用本機連線位址`);
    }
  }
  return `http://localhost:${port}`;
}

async function startServer() {
  const configCheck = validateSecurityConfiguration();
  if (process.env.NODE_ENV === "production" && !configCheck.valid) {
    console.error(`[Startup Security Failure] ${configCheck.error}`);
    process.exit(1);
  }

  const app = createExpressApp();
  const PORT = Number(process.env.PORT || 3000);
  const appUrl = getAppUrl(PORT);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Vite 產出的 /assets 檔名帶內容雜湊（index-BbbKxweN.js），
    // 內容改變檔名就會改變，因此可以安全地長期快取。
    // 未設定時 express.static 預設為 max-age=0，
    // 導致使用者每次載入都要對每個資源重新驗證。
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      immutable: true,
      maxAge: "365d"
    }));
    app.use(express.static(distPath, { maxAge: 0 }));

    // index.html 必須每次重新驗證：它指向帶雜湊的資源，
    // 若被快取，使用者更新後會拿到舊 bundle 指向已不存在的檔名。
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Judicial Modular Server] Running on ${appUrl} (Listening on port ${PORT})`);
  });
}

startServer();
