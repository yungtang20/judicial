/**
 * 法律系統稽核日誌與資料保存服務 (Audit Logging & Data Retention Policy)
 *
 * 遵循原則：
 * 1. 最小揭露原則：嚴格禁止寫入未遮蔽的當事人 PII、案件全文與密鑰
 * 2. 溯源性：每筆日誌必定關聯 Request ID、Tenant ID 與 User ID
 * 3. 保存政策：支援 90 天保存期限與容量上限自動清理
 */

import { DeidentifierService } from "./deidentifier.js";

export interface AuditLogEntry {
  id: string;
  requestId: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  status: "SUCCESS" | "FAILURE" | "DENIED";
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogService {
  private static logs: AuditLogEntry[] = [];
  private static readonly MAX_MEMORY_LOGS = 5000;
  private static readonly RETENTION_DAYS = 90;

  /**
   * 記錄一筆安全審計事件
   */
  public static log(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    // 深度清洗 metadata 中的敏感字串
    const sanitizedMetadata = entry.metadata
      ? this.sanitizeMetadata(entry.metadata)
      : undefined;

    const record: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
      metadata: sanitizedMetadata
    };

    this.logs.push(record);

    // 記憶體保護機制：若超過上限則清理舊資料
    if (this.logs.length > this.MAX_MEMORY_LOGS) {
      this.logs.splice(0, this.logs.length - this.MAX_MEMORY_LOGS);
    }

    // 輸出到伺服器標準輸出 (隱蔽 PII)
    const logPrefix = `[AUDIT] [${record.status}] [${record.tenantId}:${record.userId}]`;
    console.log(`${logPrefix} ${record.action} on ${record.resource} (${record.durationMs}ms) - ${record.statusCode} req:${record.requestId}`);
  }

  /**
   * 執行保存期限清理（清理超過 90 天的過期稽核紀錄）
   */
  public static purgeExpiredLogs(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
    const cutoffTime = cutoffDate.getTime();

    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => new Date(log.timestamp).getTime() >= cutoffTime);
    const purgedCount = initialCount - this.logs.length;
    
    if (purgedCount > 0) {
      console.log(`[AUDIT RETENTION] 清理了 ${purgedCount} 筆超過 ${this.RETENTION_DAYS} 天的舊審計紀錄。`);
    }
    return purgedCount;
  }

  /**
   * 查詢租戶審計日誌 (支援依租戶隔離與分頁)
   */
  public static getLogsByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): { total: number; logs: AuditLogEntry[] } {
    const tenantLogs = this.logs.filter((l) => l.tenantId === tenantId);
    return {
      total: tenantLogs.length,
      logs: tenantLogs.slice(offset, offset + limit)
    };
  }

  /**
   * 遞迴遮蔽 metadata 中的個資
   */
  private static sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        result[key] = DeidentifierService.anonymizeForLogs(value);
      } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        result[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
