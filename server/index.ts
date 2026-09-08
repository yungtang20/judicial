import express, { Express } from "express";
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
import legalSearchRouter from "./routes/legalSearch.js";
import legalProcessRouter from "./routes/legalProcess.js";
import unifiedWorkflowRouter from "./routes/unifiedWorkflow.js";
import agentChatRouter from "./routes/agentChat.js";
import fetchUrlRouter from "./routes/fetchUrl.js";
import { auditRouter } from "./routes/audit.js";
import guestAuthRouter from "./routes/guestAuth.js";

export function createExpressApp(): Express {
  // 啟動期環境安全性檢核：在 production 環境下未設置或不符合強度之 JWT_SECRET 立即中斷
  const configCheck = validateSecurityConfiguration();
  if (process.env.NODE_ENV === "production" && !configCheck.valid) {
    throw new Error(`[Startup Security Failure] ${configCheck.error}`);
  }

  const app = express();

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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(sanitizeRequest);
  // Guest token issuance is public; all subsequent API calls remain authenticated.
  app.use(guestAuthRouter);
  app.use(authenticate());
  app.use(tenantScopeMiddleware);
  app.use("/api", apiLimiter);

  // 2. 路由註冊
  app.use(analyzeJudgmentRouter);
  app.use(appealRouter);
  app.use(defenseRouter);
  app.use(toolboxRouter);
  app.use(triageRouter);
  app.use(judicialRouter);
  app.use(externalCitationRouter);
  app.use(legalSearchRouter);
  app.use(legalProcessRouter);
  app.use(unifiedWorkflowRouter);
  app.use(agentChatRouter);
  app.use(fetchUrlRouter);
  app.use(healthRouter);
  app.use(auditRouter);
  app.use("/api/sdlc", sdlcRouter);

  // 3. 全域錯誤處理器
  app.use(globalErrorHandler);

  return app;
}
