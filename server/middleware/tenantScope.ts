import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser } from "./auth.js";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: "admin" | "lawyer" | "paralegal" | "client" | "system";
  isSystemAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * 租戶範疇與身分隔離中介層
 * 嚴格自經過密碼學驗證之 req.user 建立租戶上下文 (Tenant Context)
 * 嚴禁外部未授權請求透過 X-Tenant-Id 或 X-User-Id 標頭任意偽造或竄改租戶與使用者身分
 */
export function tenantScopeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as AuthenticatedUser | undefined;

  // 1. 判斷是否為具備跨租戶管理權限的系統管理員
  const isSystemAdmin = user?.role === "admin" || user?.role === "system";

  // 2. 嚴格取得租戶與使用者身分：
  // 僅在具備系統管理員身分時，才允許在管理指令中明確指派目標租戶；
  // 其餘所有角色 (律師、法務、客戶、訪客) 一律強制鎖定為 Token 內簽署之 tenantId 與 userId！
  let tenantId = user?.tenantId || "sandbox-tenant";
  if (isSystemAdmin && req.headers["x-tenant-id"] && typeof req.headers["x-tenant-id"] === "string") {
    tenantId = req.headers["x-tenant-id"].trim();
  }

  const userId = user?.id || `guest_${req.id || "anonymous"}`;
  const role = user?.role || "client";

  req.tenantContext = {
    tenantId,
    userId,
    role,
    isSystemAdmin,
  };

  next();
}

/**
 * 資源所有權與租戶隔離檢核工具
 * 確保任何案件、書狀或歷史紀錄僅限同租戶與具授權之使用者存取
 */
export function verifyTenantOwnership(
  req: Request,
  resource: { tenantId?: string; userId?: string; ownerId?: string }
): { allowed: boolean; reason?: string } {
  const ctx = req.tenantContext;
  if (!ctx) {
    return { allowed: false, reason: "遺失租戶身分上下文" };
  }

  // 系統管理員或跨租戶管理帳號擁有最高審計權限
  if (ctx.isSystemAdmin) {
    return { allowed: true };
  }

  // 1. 租戶隔離檢核 (Tenant Isolation)：禁止跨租戶存取
  if (resource.tenantId && resource.tenantId !== ctx.tenantId) {
    return { allowed: false, reason: "禁止跨租戶存取案件或文件資源" };
  }

  // 2. 當事人客戶角色檢核 (一般客戶僅能讀取自己建立的案件)
  if (ctx.role === "client") {
    const resourceOwner = resource.userId || resource.ownerId;
    if (resourceOwner && resourceOwner !== ctx.userId) {
      return { allowed: false, reason: "無權存取其他當事人之專屬法律資料" };
    }
  }

  return { allowed: true };
}

/**
 * 路由守衛中介層：強制隔離案件與文件資源存取
 */
export function requireTenantScope(
  resourceTenantExtractor: (req: Request) => { tenantId?: string; userId?: string }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = resourceTenantExtractor(req);
    const check = verifyTenantOwnership(req, target);

    if (!check.allowed) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: check.reason || "無權存取此資源",
        requestId: req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`
      });
    }

    next();
  };
}
