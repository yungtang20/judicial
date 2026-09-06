import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";
// 建議策略：生產環境先使用 Report-Only 模式，待完整確認各來源後，可透過 CSP_ENFORCE=true 切換為強制阻擋模式
const isCspReportOnly = process.env.CSP_ENFORCE !== "true";

/**
 * CSP 與安全標頭配置：
 * - Production: 預設啟用 Content-Security-Policy (預設為 Report-Only 模式，防止破壞現有外部資源載入)
 * - 開發環境: 放寬或關閉 CSP 以支援 Vite HMR 與 iframe 沙盒預覽
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction
    ? {
        reportOnly: isCspReportOnly,
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
            "https://tlr.dr-legal.com.tw",
            "https://*.dr-legal.com.tw",
            process.env.APP_URL || "",
            "ws:",
            "wss:"
          ].filter(Boolean),
          workerSrc: ["'self'", "blob:"],
          frameSrc: ["'self'", "blob:", "https://ai.studio", "https://*.google.com"],
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
 * 1. 僅移除無效控制字元 (ASCII 0-8, 11-12, 14-31, 127)
 * 2. 徹底保留繁中全形/半形自然語言、標點、空白及法律書狀排版
 * 3. 移除危險的 <script> 標籤；不誤殺包含空白或文字提及 'javascript:' 的正常法律內容
 * 4. 對巢狀 object、array 遞迴處理
 */
export function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // 移除 ASCII 控制字元 (保留換行 \n、Tab \t、Carriage Return \r)
    let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // 移除危險的 script 標籤，不使用粗暴字串比對誤殺正常法律文本
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
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
 * 全域錯誤處理器 (統一結構，生產環境脫敏防禦)
 */
export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Server Error] [${req.method} ${req.url}]:`, err);
  const isProd = process.env.NODE_ENV === "production";
  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: isProd ? "伺服器處理異常，請稍後重試" : (err.message || "伺服器內部錯誤"),
    requestId: req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`,
    details: isProd ? undefined : err.stack
  });
}
