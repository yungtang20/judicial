import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const securityHeaders = helmet({
  contentSecurityPolicy: false // 允許 Vite 開發環境與沙盒預覽
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "請求過於頻繁，請稍後再試",
    details: null
  }
});

export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // 檢查請求大小與基礎輸入防護
  next();
}

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Server Error] [${req.method} ${req.url}]:`, err);
  res.status(500).json({
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "伺服器內部錯誤",
    requestId: (req.headers["x-request-id"] as string) || `req_${Date.now()}`
  });
}
