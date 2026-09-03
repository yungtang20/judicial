import express, { Express } from "express";
import { securityHeaders, apiLimiter, sanitizeRequest, globalErrorHandler } from "./middleware/security.js";
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

export function createExpressApp(): Express {
  const app = express();

  // 僅信任前方一層反向代理，避免用戶端偽造 X-Forwarded-For 繞過限流
  app.set("trust proxy", 1);

  // 1. 中介軟體
  app.use(securityHeaders);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(sanitizeRequest);
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
  app.use(healthRouter);
  app.use("/api/sdlc", sdlcRouter);

  // 3. 全域錯誤處理器
  app.use(globalErrorHandler);

  return app;
}
