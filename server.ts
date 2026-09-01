import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createExpressApp } from "./server/index.js";

dotenv.config();

// 清理無效的 BASE_URL 金鑰字串
const rawBaseUrl = process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL;
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  console.log(`[Gemini Env] 清理無效的 BASE_URL 字串`);
  delete process.env.GOOGLE_GEMINI_BASE_URL;
  delete process.env.GEMINI_BASE_URL;
}

async function startServer() {
  const app = createExpressApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Judicial Modular Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
