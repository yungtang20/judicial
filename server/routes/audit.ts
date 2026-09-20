import { Router, Request, Response } from "express";
import { AuditLogService } from "../services/auditLog.js";
import { verifyTenantOwnership } from "../middleware/tenantScope.js";
import {
  summarizeAuditFailures,
  topFailureGroups,
  formatFlywheelReport,
  type FlywheelLogInput
} from "../../src/lib/auditFlywheel.js";

export const auditRouter = Router();

const FLYWHEEL_PAGE_SIZE = 100;

/**
 * 稽核資料飛輪（手動觸發端點）: 讀取租戶稽核紀錄 → summarizeAuditFailures → 週報
 * GET /api/audit/flywheel?limit=100&format=report|json
 * 依既有租戶隔離規則；僅彙整動作／資源／狀態碼與筆數，不取個資欄位
 */
auditRouter.get("/api/audit/flywheel", (req: Request, res: Response) => {
  const ctx = req.tenantContext;
  if (!ctx) {
    return res.status(401).json({
      error: "未授權存取稽核紀錄",
      code: "UNAUTHORIZED",
      status: 401
    });
  }

  const requestedTenant = req.query.tenantId as string | undefined;
  if (requestedTenant && requestedTenant !== ctx.tenantId && !ctx.isSystemAdmin) {
    return res.status(403).json({
      error: "禁止跨租戶查詢稽核日誌",
      code: "PERMISSION_DENIED",
      status: 403
    });
  }

  const targetTenantId = ctx.isSystemAdmin && requestedTenant ? requestedTenant : ctx.tenantId;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || FLYWHEEL_PAGE_SIZE));

  // 分頁讀完該租戶全部稽核紀錄（僅取飛輪所需欄位）
  const entries: FlywheelLogInput[] = [];
  let offset = 0;
  while (true) {
    const page = AuditLogService.getLogsByTenant(targetTenantId, FLYWHEEL_PAGE_SIZE, offset);
    if (page.logs.length === 0) break;
    for (const log of page.logs) {
      entries.push({
        action: log.action,
        resource: log.resource,
        status: log.status,
        statusCode: log.statusCode
      });
      if (entries.length >= limit) break;
    }
    if (entries.length >= limit || page.logs.length < FLYWHEEL_PAGE_SIZE) break;
    offset += FLYWHEEL_PAGE_SIZE;
  }

  const summary = summarizeAuditFailures(entries);
  const top = topFailureGroups(summary, 5);
  const report = formatFlywheelReport(summary, 5);

  const wantsReport = req.query.format === "report";
  return res.json({
    success: true,
    tenantId: targetTenantId,
    sampled: entries.length,
    ...(wantsReport ? { report } : { summary, top })
  });
});

/**
 * 查詢租戶專屬稽核日誌 (GET /api/audit/logs)
 * 嚴格以 server-side tenantContext 為準，禁止未授權跨租戶窺探
 */
auditRouter.get("/api/audit/logs", (req: Request, res: Response) => {
  const ctx = req.tenantContext;
  if (!ctx) {
    return res.status(401).json({
      error: "未授權存取稽核紀錄",
      code: "UNAUTHORIZED",
      status: 401
    });
  }

  // 檢查 client 是否企圖透過 query string 偽造或窺探其他租戶 (IDOR / Spoofing)
  const requestedTenant = req.query.tenantId as string | undefined;
  if (requestedTenant && requestedTenant !== ctx.tenantId && !ctx.isSystemAdmin) {
    return res.status(403).json({
      error: "禁止跨租戶查詢稽核日誌",
      code: "PERMISSION_DENIED",
      status: 403
    });
  }

  const targetTenantId = ctx.isSystemAdmin && requestedTenant ? requestedTenant : ctx.tenantId;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const result = AuditLogService.getLogsByTenant(targetTenantId, limit, offset);
  return res.json({
    success: true,
    tenantId: targetTenantId,
    total: result.total,
    logs: result.logs
  });
});

/**
 * 查詢單筆稽核紀錄 (GET /api/audit/logs/:id)
 * 嚴格執行 BOLA / IDOR 檢核
 */
auditRouter.get("/api/audit/logs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const log = AuditLogService.getLogById(id);
  if (!log) {
    return res.status(404).json({
      error: `找不到 ID 為 [${id}] 之稽核紀錄`,
      code: "NOT_FOUND",
      status: 404
    });
  }

  const check = verifyTenantOwnership(req, log);
  if (!check.allowed) {
    return res.status(403).json({
      error: check.reason || "禁止跨租戶存取其他租戶之稽核紀錄",
      code: "PERMISSION_DENIED",
      status: 403
    });
  }

  return res.json({
    success: true,
    log
  });
});

/**
 * 嘗試修改稽核紀錄 (PATCH / PUT /api/audit/logs/:id)
 * 稽核日誌依法與治理規則不可篡改 (Tamper-Proof)
 * 注意：/api/audit/flywheel 為唯讀彙整端點，不影響上述不可篡改性
 */
auditRouter.patch("/api/audit/logs/:id", (_req: Request, res: Response) => {
  return res.status(403).json({
    error: "稽核紀錄具備不可篡改性，嚴禁修改",
    code: "PERMISSION_DENIED",
    status: 403
  });
});

auditRouter.put("/api/audit/logs/:id", (_req: Request, res: Response) => {
  return res.status(403).json({
    error: "稽核紀錄具備不可篡改性，嚴禁覆寫",
    code: "PERMISSION_DENIED",
    status: 403
  });
});

/**
 * 嘗試刪除稽核紀錄 (DELETE /api/audit/logs/:id)
 * 普通租戶絕對禁止刪除法律審計存證
 */
auditRouter.delete("/api/audit/logs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const log = AuditLogService.getLogById(id);
  if (!log) {
    return res.status(404).json({
      error: `找不到 ID 為 [${id}] 之稽核紀錄`,
      code: "NOT_FOUND",
      status: 404
    });
  }

  const check = verifyTenantOwnership(req, log);
  if (!check.allowed) {
    return res.status(403).json({
      error: "禁止跨租戶刪除或操作稽核存證",
      code: "PERMISSION_DENIED",
      status: 403
    });
  }

  return res.status(403).json({
    error: "稽核紀錄受法律資料保存政策保護，普通租戶禁止刪除",
    code: "PERMISSION_DENIED",
    status: 403
  });
});
