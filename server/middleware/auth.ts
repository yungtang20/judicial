import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../services/auditLog.js";
import crypto from "node:crypto";

export interface AuthenticatedUser {
  id: string;
  role: "admin" | "lawyer" | "paralegal" | "client" | "system";
  tenantId: string;
  name?: string;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: "admin" | "lawyer" | "paralegal" | "client" | "system";
  name?: string;
  exp?: number;
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthenticatedUser;
      startTime?: number;
    }
  }
}

export interface SecurityConfigResult {
  valid: boolean;
  error?: string;
}

const INSECURE_FALLBACK_SECRETS = new Set([
  "development-only-fallback-secret-key-at-least-32-chars",
  "your-secret-key-must-be-at-least-32-chars",
  "default-insecure-secret-key-change-me",
  "01234567890123456789012345678901",
  "changeme",
  "secret",
  "password"
]);

/**
 * 伺服器啟動期安全環境設定校驗 (Startup Fail-Closed Validation)
 * 確保在 production 環境下具備足夠長度與強度之 JWT 密鑰，絕不使用固定 fallback
 */
export function validateSecurityConfiguration(env: NodeJS.ProcessEnv = process.env): SecurityConfigResult {
  const isProd = env.NODE_ENV === "production";
  const secret = (env.JWT_SECRET || env.AUTH_SECRET || "").trim();

  if (isProd) {
    if (!secret) {
      return {
        valid: false,
        error: "FATAL_CONFIG: JWT_SECRET or AUTH_SECRET is required in production environment."
      };
    }
    if (secret.length < 32) {
      return {
        valid: false,
        error: "FATAL_CONFIG: Production JWT_SECRET must be at least 32 characters long."
      };
    }
    if (INSECURE_FALLBACK_SECRETS.has(secret)) {
      return {
        valid: false,
        error: "FATAL_CONFIG: Insecure default or fallback secret is strictly forbidden in production."
      };
    }
    if (new Set(secret).size < 8) {
      return {
        valid: false,
        error: "FATAL_CONFIG: Production JWT_SECRET has dangerously low entropy (fewer than 8 unique characters)."
      };
    }
  }

  return { valid: true };
}

/**
 * 取得當前有效的 JWT 簽署密鑰
 * 拒絕在 HTTP request 執行期使用 process.exit(1)，若 production 未配置則拋出例外 fail-closed
 */
export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = (env.JWT_SECRET || env.AUTH_SECRET || "").trim();
  const isProd = env.NODE_ENV === "production";

  if (isProd) {
    if (!secret || secret.length < 32 || INSECURE_FALLBACK_SECRETS.has(secret)) {
      throw new Error("PRODUCTION_AUTH_CONFIG_ERROR: Missing or insecure JWT_SECRET in production environment");
    }
    return secret;
  }

  return secret || "development-only-fallback-secret-key-at-least-32-chars";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * 簽署合規之 HS256 JWT Token
 */
export function createSignedToken(
  payload: Omit<JwtPayload, "iat">,
  secret?: string,
  expiresInSeconds: number = 86400 * 7
): string {
  const effectiveSecret = secret || getJwtSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: payload.exp !== undefined ? payload.exp : now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac("sha256", effectiveSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 嚴格密碼學驗證 JWT Token (防止偽造與過期)
 */
export function verifySignedToken(token: string, secret?: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, receivedSignature] = parts;
    const effectiveSecret = secret || getJwtSecret();

    // 1. 重新計算 HMAC 簽名並使用常數時間比對 (防止 Timing Attack)
    const expectedSignature = crypto
      .createHmac("sha256", effectiveSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const receivedBuf = Buffer.from(receivedSignature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
      return null;
    }

    // 2. 解析 Header 與 Payload
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== "HS256") return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // 3. 檢查過期時間 (exp) - 嚴格 Fail-Closed (缺少 exp 或非正數一律拒絕)
    if (typeof payload.exp !== "number" || isNaN(payload.exp) || payload.exp <= 0) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) {
      return null;
    }

    // 4. 驗證必要欄位與合法角色
    const validRoles = ["admin", "lawyer", "paralegal", "client", "system"];
    if (
      !payload.sub || typeof payload.sub !== "string" || payload.sub.trim() === "" ||
      !payload.tenantId || typeof payload.tenantId !== "string" || payload.tenantId.trim() === "" ||
      !validRoles.includes(payload.role)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * 驗證 API Key 是否為伺服器允許的有效金鑰 (使用常數時間比對)
 */
function verifyApiKey(receivedKey: string): { valid: boolean; role?: "system" | "admin"; tenantId?: string } {
  if (!receivedKey || typeof receivedKey !== "string") return { valid: false };

  const validKeys: Array<{ key: string; role: "system" | "admin"; tenantId: string }> = [];

  if (process.env.ADMIN_API_KEY) {
    validKeys.push({ key: process.env.ADMIN_API_KEY.trim(), role: "admin", tenantId: "system-admin-tenant" });
  }
  if (process.env.SYSTEM_API_KEY) {
    validKeys.push({ key: process.env.SYSTEM_API_KEY.trim(), role: "system", tenantId: "system-service-tenant" });
  }
  if (process.env.API_KEYS) {
    const keys = process.env.API_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
    keys.forEach((k) => validKeys.push({ key: k, role: "system", tenantId: "default-tenant" }));
  }

  // 避免在開發環境且無任何設定時誤放行
  if (validKeys.length === 0) {
    return { valid: false };
  }

  const recBuf = Buffer.from(receivedKey);
  for (const item of validKeys) {
    const itemBuf = Buffer.from(item.key);
    if (recBuf.length === itemBuf.length && crypto.timingSafeEqual(recBuf, itemBuf)) {
      return { valid: true, role: item.role, tenantId: item.tenantId };
    }
  }

  return { valid: false };
}

/**
 * Request ID 嚴格校驗與伺服器端 UUID 產生中介層
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingReqId = req.headers["x-request-id"];

  // 嚴格檢驗客戶端帶入的 Request ID 格式（僅接受 8~64 字元英數破折號），防止注入或過長標頭
  const safeReqId =
    typeof incomingReqId === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingReqId.trim())
      ? incomingReqId.trim()
      : `req_${crypto.randomUUID()}`;

  req.id = safeReqId;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", safeReqId);

  // 請求完成時自動寫入審計紀錄
  res.on("finish", () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const isSuccess = res.statusCode < 400;

    // 不記錄靜態資源與健康檢查以節省開銷
    if (!req.path.startsWith("/api/health") && !req.path.startsWith("/assets")) {
      AuditLogService.log({
        requestId: req.id || safeReqId,
        tenantId: req.tenantContext?.tenantId || req.user?.tenantId || "sandbox-tenant",
        userId: req.tenantContext?.userId || req.user?.id || "anonymous",
        action: `${req.method} ${req.baseUrl || ""}${req.path}`,
        resource: req.baseUrl || req.path,
        status: isSuccess ? "SUCCESS" : res.statusCode === 401 || res.statusCode === 403 ? "DENIED" : "FAILURE",
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
 * 嚴格身分認證中介層
 * - Bearer Token: 必須具備有效密碼學簽名與合規 Payload，偽造立即回傳 401
 * - X-API-Key: 必須匹配伺服器配置金鑰，無效立即回傳 401
 * - 未提供憑證：若 options.required = true (或 REQUIRE_AUTH=true) 則拒絕；否則給予隔離之 sandbox-tenant 訪客身分
 */
export function authenticate(options: { required?: boolean } = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const requireAuthEnv = process.env.REQUIRE_AUTH === 'true';
  const mustRequire = options.required ?? (isProd ? true : requireAuthEnv);

  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

    // 1. 若客戶端提供了 Bearer Token，強制進行密碼學簽名驗證
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const verified = verifySignedToken(token);

      if (!verified) {
        return res.status(401).json({
          code: "INVALID_CREDENTIALS",
          message: "Bearer Token 驗證失敗或已過期，拒絕存取",
          requestId: req.id
        });
      }

      req.user = {
        id: verified.sub,
        role: verified.role,
        tenantId: verified.tenantId,
        name: verified.name || `User ${verified.sub}`
      };
      return next();
    }

    // 2. 若客戶端提供了 API Key，強制驗證金鑰
    if (apiKeyHeader) {
      const check = verifyApiKey(apiKeyHeader.trim());
      if (!check.valid) {
        return res.status(401).json({
          code: "INVALID_API_KEY",
          message: "API Key 無效或未經授權",
          requestId: req.id
        });
      }

      req.user = {
        id: `svc_${crypto.createHash("sha256").update(apiKeyHeader).digest("hex").slice(0, 10)}`,
        role: check.role || "system",
        tenantId: check.tenantId || "system-service-tenant",
        name: "Verified Service Account"
      };
      return next();
    }

    // 3. 未提供任何憑證時，檢查是否為強制認證模式
    if (mustRequire) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "此 API 需要提供有效之身分驗證憑證 (Bearer Token 或 X-API-Key)",
        requestId: req.id
      });
    }

    // 4. 沙盒預覽環境：分配固定隔離的沙盒訪客身分 (租戶固定為 sandbox-tenant，使用者不可藉由 Header 偽造)
    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "agent";
    const guestHash = crypto
      .createHash("sha256")
      .update(`${clientIp}-${userAgent}-${req.id || ""}`)
      .digest("hex")
      .slice(0, 12);

    req.user = {
      id: `guest_${guestHash}`,
      role: "client",
      tenantId: "sandbox-tenant", // 固定租戶邊界，徹底隔絕跨租戶存取
      name: "Sandbox Guest"
    };

    next();
  };
}

/**
 * 強制認證中介層守衛
 */
export const requireAuth = () => authenticate({ required: true });
