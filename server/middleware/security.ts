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
  // 檢查請求大小
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) { // 1MB limit for API requests
    return res.status(413).json({ error: "PAYLOAD_TOO_LARGE", message: "請求內容過大" });
  }

  // 基礎字串過濾與 XSS 防護 (僅針對 JSON Body)
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Strip out control characters and potentially dangerous script tags
        let cleaned = req.body[key].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        if (cleaned.includes('<script>') || cleaned.includes('javascript:')) {
           return res.status(400).json({ error: "INVALID_INPUT", message: "偵測到無效或危險的字串" });
        }
        req.body[key] = cleaned;
      }
    }
  }
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
