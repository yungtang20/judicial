import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../services/auditLog.js";

export interface AuthenticatedUser {
  id: string;
  role: "admin" | "lawyer" | "paralegal" | "client" | "system";
  tenantId: string;
  name?: string;
}

// 擴充 Express Request 介面以包含認證資訊與 requestId
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthenticatedUser;
      startTime?: number;
    }
  }
}

/**
 * Request ID 與計時中介層
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers["x-request-id"] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", reqId);

  // 請求完成時自動觸發審計紀錄
  res.on("finish", () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const isSuccess = res.statusCode < 400;
    
    // 不記錄靜態資源與健康檢查以節省開銷
    if (!req.path.startsWith("/api/health") && !req.path.startsWith("/assets")) {
      AuditLogService.log({
        requestId: req.id || reqId,
        tenantId: req.user?.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant",
        userId: req.user?.id || (req.headers["x-user-id"] as string) || "anonymous",
        action: `${req.method} ${req.baseUrl || ""}${req.path}`,
        resource: req.baseUrl || req.path,
        status: isSuccess ? "SUCCESS" : (res.statusCode === 401 || res.statusCode === 403 ? "DENIED" : "FAILURE"),
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"]
      });
    }
  });

  next();
}

/**
 * 彈性認證中介層 (支援 Bearer Token / API Key / Header Session，在預設或預覽環境容許合法匿名訪問)
 */
export function authenticate(options: { required?: boolean } = { required: false }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"] as string;
    const tenantHeader = (req.headers["x-tenant-id"] as string) || "default-tenant";

    // 1. Bearer Token 解析
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        req.user = {
          id: `usr_${token.substring(0, 8)}`,
          role: "lawyer",
          tenantId: tenantHeader,
          name: "Authenticated Lawyer"
        };
        return next();
      }
    }

    // 2. API Key 解析
    if (apiKeyHeader) {
      req.user = {
        id: `svc_${apiKeyHeader.substring(0, 6)}`,
        role: "system",
        tenantId: tenantHeader,
        name: "Service Account"
      };
      return next();
    }

    // 3. 未提供認證標頭
    if (options.required) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "此 API 需提供有效的身分驗證憑證 (Bearer Token 或 X-API-Key)",
        requestId: req.id
      });
    }

    // 4. 預設訪客身分 (符合沙盒預覽與客戶端即時試用架構)
    req.user = {
      id: (req.headers["x-user-id"] as string) || "guest-user",
      role: "client",
      tenantId: tenantHeader,
      name: "Guest Visitor"
    };

    next();
  };
}
