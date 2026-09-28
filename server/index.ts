import express, { Express } from "express";
import type { NextFunction, Request, Response } from "express";
import { securityHeaders, apiLimiter, sanitizeRequest, globalErrorHandler } from "./middleware/security.js";
import { requestIdMiddleware, authenticate, validateSecurityConfiguration } from "./middleware/auth.js";
import { tenantScopeMiddleware } from "./middleware/tenantScope.js";
import analyzeJudgmentRouter from "./routes/analyzeJudgment.js";
import appealRouter from "./routes/appeal.js";
import defenseRouter from "./routes/defense.js";
import toolboxRouter from "./routes/toolbox.js";
import triageRouter from "./routes/triage.js";
import judicialRouter from "./routes/judicial.js";
import healthRouter from "./routes/health.js";
import { sdlcRouter } from "./routes/sdlc.js";
import externalCitationRouter from "./routes/externalCitation.js";
import legalProcessRouter from "./routes/legalProcess.js";
import unifiedWorkflowRouter from "./routes/unifiedWorkflow.js";
import agentChatRouter from "./routes/agentChat.js";
import legalSearchRouter from "./routes/legalSearch.js";
import draftRefinerRouter from "./routes/draftRefiner.js";
import fetchUrlRouter from "./routes/fetchUrl.js";
import { auditRouter } from "./routes/audit.js";
import guestAuthRouter from "./routes/guestAuth.js";
import officialTemplatesRouter from "./routes/officialTemplates.js";

export function createExpressApp(): Express {
  // 啟動期環境安全性檢核：在 production 環境下未設置或不符合強度之 JWT_SECRET 立即中斷
  const configCheck = validateSecurityConfiguration();
  if (process.env.NODE_ENV === "production" && !configCheck.valid) {
    throw new Error(`[Startup Security Failure] ${configCheck.error}`);
  }

  const app = express();
  // All application query parameters are scalar values; avoid qs expansion
  // for URL query strings as well as URL-encoded request bodies.
  app.set("query parser", "simple");

  // 反向代理信任設定：支援布林值 ("true"/"false")、數字 (例如 1, 2) 或指定 IP/網段
  const rawTrustProxy = process.env.TRUST_PROXY;
  let trustProxySetting: boolean | number | string = 1;
  if (rawTrustProxy !== undefined) {
    if (rawTrustProxy.toLowerCase() === "true") {
      trustProxySetting = true;
    } else if (rawTrustProxy.toLowerCase() === "false") {
      trustProxySetting = false;
    } else if (!isNaN(Number(rawTrustProxy))) {
      trustProxySetting = Number(rawTrustProxy);
    } else {
      trustProxySetting = rawTrustProxy;
    }
  }
  app.set("trust proxy", trustProxySetting);

  // 1. 中介軟體
  app.use(requestIdMiddleware);
  app.use(securityHeaders);

  // Infrastructure health probes must remain available and must not consume
  // the shared application API quota.
  app.use(healthRouter);

  // Rate-limit all API traffic, including guest-token issuance and failed
  // authentication attempts, before parsing potentially expensive request bodies.
  app.use("/api", apiLimiter);

  app.use(express.json({ limit: "1mb" }));
  // No route consumes nested URL-encoded objects; use Node's simple parser to
  // avoid enabling the qs extended-parser attack surface.
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(sanitizeRequest);
  // Guest token issuance is public; all subsequent API calls remain authenticated.
  app.use(guestAuthRouter);
  app.use(authenticate());
  app.use(tenantScopeMiddleware);

  // 2. 路由註冊
  app.use(analyzeJudgmentRouter);
  app.use(appealRouter);
  app.use(defenseRouter);
  app.use(toolboxRouter);
  app.use(triageRouter);
  app.use(judicialRouter);
  app.use(externalCitationRouter);
  app.use(legalProcessRouter);
  app.use(unifiedWorkflowRouter);
  app.use(agentChatRouter);
  app.use(draftRefinerRouter);
  app.use(fetchUrlRouter);
  app.use(auditRouter);
  app.use(legalSearchRouter);
  app.use(officialTemplatesRouter);
  app.use("/api/sdlc", sdlcRouter);

  // 未註冊的 API 路徑必須回 JSON。
  // 交給 Express 預設處理會回 HTML 錯誤頁，既破壞 API 契約
  // （用戶端拿到非 JSON 無從解析），也會洩漏所用框架。
  app.use("/api", (_req: Request, res: Response, _next: NextFunction) => {

    res.status(404).json({
      code: "ENDPOINT_NOT_FOUND",
      message: "此 API 端點不存在",
    });
  });

  // 3. 全域錯誤處理器
  app.use(globalErrorHandler);

  return app;
}
