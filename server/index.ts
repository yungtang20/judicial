import express, { Express } from "express";
import { securityHeaders, apiLimiter, sanitizeRequest, globalErrorHandler } from "./middleware/security.js";
import { requestIdMiddleware, authenticate } from "./middleware/auth.js";
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

export function createExpressApp(): Express {
  const app = express();

  // 反向代理信任設定：預設信任 1 層，亦可透過環境變數 TRUST_PROXY 設定
  const rawTrustProxy = process.env.TRUST_PROXY;
  const trustProxySetting = rawTrustProxy
    ? (!isNaN(Number(rawTrustProxy)) ? Number(rawTrustProxy) : rawTrustProxy)
    : 1;
  app.set("trust proxy", trustProxySetting);

  // 1. 中介軟體
  app.use(requestIdMiddleware);
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(sanitizeRequest);
  app.use(authenticate());
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
  app.use("/api/sdlc", sdlcRouter);

  // 3. 全域錯誤處理器
  app.use(globalErrorHandler);

  return app;
}
