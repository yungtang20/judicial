import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createExpressApp } from "./server/index.js";
import { validateSecurityConfiguration } from "./server/middleware/auth.js";
import { warmOfficialStatuteIndex } from "./server/services/statuteExistenceProvider.js";

// 預載官方法規索引，讓法條查證以官方即時資料為準，
// 而不是會過期的本機靜態索引（實測該索引只涵蓋民法 3.3%，
// 且硬編的條號上限已落後：民訴法實際 640 條，索引仍寫 607）。
// 刻意不 await：官方來源不可用時伺服器仍應正常啟動，
// 該情況下查證會退回本機索引，fail-closed 行為不變。
void warmOfficialStatuteIndex();

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

    // 其餘 dist 內容（如日後由 public/ 複製進來的 robots.txt、manifest）照常提供，
    // 但不得長期快取。
    //
    // 伺服器 bundle 刻意建置到 build/ 而非 dist/：
    // 先前 server.cjs 與 server.cjs.map 落在 dist/，整目錄公開等於把
    // 後端程式碼與完整原始碼（含全部檔名清單）送到任何訪客手上。
    // 檔案不在此目錄，就不需要靠規則去擋它。
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
