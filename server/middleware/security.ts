import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

/**
 * CSP 與安全標頭配置：
 * - Production: 啟用嚴謹的 Content-Security-Policy，白名單開放司法院 OpenData、Gemini API 與必要腳本/樣式來源。
 * - Development / Preview: 放寬或關閉 CSP 以支援 Vite HMR 與 iframe 沙盒預覽。
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: [
            "'self'",
            "https://generativelanguage.googleapis.com",
            "https://data.judicial.gov.tw",
            "https://*.run.app",
            "ws:",
            "wss:"
          ],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com"],
          upgradeInsecureRequests: []
        }
      }
    : false,
  crossOriginEmbedderPolicy: false
});

/**
 * 請求速率限制（防止 DoS 與暴力請求）
 */
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

/**
 * 遞迴字串清洗器：
 * 1. 移除無效控制字元 (ASCII 0-8, 11-12, 14-31, 127)
 * 2. 保留繁中全形/半形自然語言、標點、空白及法律書狀排版
 * 3. 移除危險的 <script> 標籤與 javascript: 偽協議，避免 XSS
 */
export function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // 移除 ASCII 控制字元 (保留換行 \n、Tab \t、Carriage Return \r)
    let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // 移除危險的 script 標籤與 javascript: 協議，但保留正常字串與空白
    cleaned = cleaned
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript\s*:/gi, '');
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj;
  }

  return value;
}

/**
 * 統一大小與輸入清洗中介層：
 * 1. 針對一般 API 限制 1MB
 * 2. 檢測實際 Body 大小，不只依賴可能缺失的 Content-Length
 * 3. 遞迴清洗 req.body
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // 檢查 Content-Length header (若存在)
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) { // 1MB limit for standard API
    return res.status(413).json({
      code: "PAYLOAD_TOO_LARGE",
      message: "請求內容大小超過 1MB 限制",
      requestId: (req.headers["x-request-id"] as string) || `req_${Date.now()}`
    });
  }

  // 檢查實際 Body 記憶體佔用大小
  if (req.body && typeof req.body === 'object') {
    try {
      const bodyString = JSON.stringify(req.body);
      if (Buffer.byteLength(bodyString, 'utf8') > 1024 * 1024) {
        return res.status(413).json({
          code: "PAYLOAD_TOO_LARGE",
          message: "請求實際負載超過 1MB 限制",
          requestId: (req.headers["x-request-id"] as string) || `req_${Date.now()}`
        });
      }

      // 遞迴清洗
      req.body = sanitizeValue(req.body);
    } catch {
      return res.status(400).json({
        code: "MALFORMED_JSON",
        message: "無效的 JSON 請求格式",
        requestId: (req.headers["x-request-id"] as string) || `req_${Date.now()}`
      });
    }
  }

  next();
}

/**
 * 全域錯誤處理器 (統一結構)
 */
export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Server Error] [${req.method} ${req.url}]:`, err);
  res.status(err.status || 500).json({
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "伺服器內部錯誤",
    requestId: (req.headers["x-request-id"] as string) || `req_${Date.now()}`,
    details: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
}
