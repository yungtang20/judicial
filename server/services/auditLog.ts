/**
 * 法律系統稽核日誌與資料保存服務 (Audit Logging & Data Retention Policy)
 *
 * 遵循原則：
 * 1. 最小揭露原則：嚴格禁止寫入未遮蔽的當事人 PII、案件全文與密鑰
 * 2. 溯源性：每筆日誌必定關聯 Request ID、Tenant ID 與 User ID
 * 3. 保存政策：支援 90 天保存期限與容量上限自動清理
 * 4. 持久化：使用 SQLite 本地資料庫持久保存，重啟不遺失日誌
 */

import { DeidentifierService } from "./deidentifier.js";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

let DatabaseSync: any;
try {
  const req = typeof require !== "undefined" ? require : (typeof import.meta !== "undefined" && import.meta.url ? createRequire(import.meta.url) : null);
  if (req) {
    DatabaseSync = req("node:sqlite")?.DatabaseSync;
  }
} catch {
  DatabaseSync = undefined;
}

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
  private static db: any = null;
  private static logs: AuditLogEntry[] = [];
  private static readonly MAX_MEMORY_LOGS = 1000;
  private static readonly RETENTION_DAYS = 90;
  private static initialized = false;
  private static persistenceMode: "sqlite" | "memory" = "memory";
  private static persistenceError: string | undefined;

  private static initDb(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (DatabaseSync) {
        const dbPath = process.env.AUDIT_DB_PATH || path.resolve(process.cwd(), "data", "audit_logs.sqlite");
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new DatabaseSync(dbPath);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            requestId TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            tenantId TEXT NOT NULL,
            userId TEXT NOT NULL,
            action TEXT NOT NULL,
            resource TEXT NOT NULL,
            status TEXT NOT NULL,
            statusCode INTEGER NOT NULL,
            durationMs INTEGER NOT NULL,
            ip TEXT NOT NULL,
            userAgent TEXT,
            metadata TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_logs (tenantId, timestamp);
        `);
        this.persistenceMode = "sqlite";
        this.persistenceError = undefined;
      }
    } catch (e) {
      this.persistenceMode = "memory";
      this.persistenceError = e instanceof Error ? e.message : "SQLITE_INIT_FAILED";
      if (process.env.NODE_ENV === "production" && process.env.AUDIT_PERSISTENCE_REQUIRED === "true") {
        throw new Error(`AUDIT_PERSISTENCE_REQUIRED: ${this.persistenceError}`);
      }
      console.warn("[AuditLogService] SQLite 初始化警示，採用記憶體模式紀錄:", e);
    }
  }

  public static getPersistenceStatus(): { mode: "sqlite" | "memory"; durable: boolean; error?: string } {
    this.initDb();
    const configuredPath = process.env.AUDIT_DB_PATH || "";
    const durable = this.persistenceMode === "sqlite" && configuredPath !== ":memory:" && Boolean(configuredPath);
    return { mode: this.persistenceMode, durable, error: this.persistenceError };
  }

  /**
   * 記錄一筆安全審計事件 (寫入 SQLite 持久化與記憶體快取)
   */
  public static log(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    this.initDb();

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

    // 1. 持久化至 SQLite 資料庫
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO audit_logs (id, requestId, timestamp, tenantId, userId, action, resource, status, statusCode, durationMs, ip, userAgent, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.requestId,
          record.timestamp,
          record.tenantId,
          record.userId,
          record.action,
          record.resource,
          record.status,
          record.statusCode,
          record.durationMs,
          record.ip,
          record.userAgent || null,
          record.metadata ? JSON.stringify(record.metadata) : null
        );
      } catch (err) {
        console.warn("[AuditLogService] 寫入 SQLite 稽核紀錄失敗:", err);
      }
    }

    // 2. 維護記憶體快取
    this.logs.push(record);
    if (this.logs.length > this.MAX_MEMORY_LOGS) {
      this.logs.splice(0, this.logs.length - this.MAX_MEMORY_LOGS);
    }

    // 3. 輸出到伺服器標準輸出 (隱蔽 PII)
    const logPrefix = `[AUDIT] [${record.status}] [${record.tenantId}:${record.userId}]`;
    console.log(`${logPrefix} ${record.action} on ${record.resource} (${record.durationMs}ms) - ${record.statusCode} req:${record.requestId}`);
  }

  /**
   * 執行保存期限清理（清理超過 90 天的過期稽核紀錄）
   */
  public static purgeExpiredLogs(): number {
    this.initDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    let purgedCount = 0;
    if (this.db) {
      try {
        const stmt = this.db.prepare(`DELETE FROM audit_logs WHERE timestamp < ?`);
        const result = stmt.run(cutoffIso);
        purgedCount = result.changes || 0;
      } catch (err) {
        console.warn("[AuditLogService] 清理過期紀錄失敗:", err);
      }
    }

    const initialMemCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp >= cutoffIso);
    purgedCount = Math.max(purgedCount, initialMemCount - this.logs.length);

    if (purgedCount > 0) {
      console.log(`[AUDIT RETENTION] 清理了 ${purgedCount} 筆超過 ${this.RETENTION_DAYS} 天的舊審計紀錄。`);
    }
    return purgedCount;
  }

  /**
   * 查詢租戶審計日誌 (支援依租戶隔離與分頁，優先自 SQLite 查詢)
   */
  public static getLogsByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): { total: number; logs: AuditLogEntry[] } {
    this.initDb();

    if (this.db) {
      try {
        const countStmt = this.db.prepare(`SELECT count(*) as count FROM audit_logs WHERE tenantId = ?`);
        const countRow = countStmt.get(tenantId) as { count: number } | undefined;
        const total = countRow?.count || 0;

        const queryStmt = this.db.prepare(`
          SELECT * FROM audit_logs WHERE tenantId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?
        `);
        const rows = queryStmt.all(tenantId, limit, offset) as any[];
        const logs: AuditLogEntry[] = rows.map((r) => ({
          id: r.id,
          requestId: r.requestId,
          timestamp: r.timestamp,
          tenantId: r.tenantId,
          userId: r.userId,
          action: r.action,
          resource: r.resource,
          status: r.status,
          statusCode: Number(r.statusCode),
          durationMs: Number(r.durationMs),
          ip: r.ip,
          userAgent: r.userAgent || undefined,
          metadata: r.metadata ? JSON.parse(r.metadata) : undefined
        }));

        return { total, logs };
      } catch (err) {
        console.warn("[AuditLogService] 查詢 SQLite 稽核紀錄失敗，降級為記憶體查詢:", err);
      }
    }

    const tenantLogs = this.logs.filter((l) => l.tenantId === tenantId);
    return {
      total: tenantLogs.length,
      logs: tenantLogs.slice(offset, offset + limit)
    };
  }

  /**
   * 查詢單筆稽核紀錄 (依 ID 檢索)
   */
  public static getLogById(id: string): AuditLogEntry | null {
    this.initDb();

    if (this.db) {
      try {
        const queryStmt = this.db.prepare(`SELECT * FROM audit_logs WHERE id = ?`);
        const r = queryStmt.get(id) as any;
        if (r) {
          return {
            id: r.id,
            requestId: r.requestId,
            timestamp: r.timestamp,
            tenantId: r.tenantId,
            userId: r.userId,
            action: r.action,
            resource: r.resource,
            status: r.status,
            statusCode: Number(r.statusCode),
            durationMs: Number(r.durationMs),
            ip: r.ip,
            userAgent: r.userAgent || undefined,
            metadata: r.metadata ? JSON.parse(r.metadata) : undefined
          };
        }
      } catch (err) {
        console.warn("[AuditLogService] 查詢單筆 SQLite 稽核紀錄失敗:", err);
      }
    }

    const found = this.logs.find((l) => l.id === id);
    return found || null;
  }

  /**
   * 遞迴清洗任意型別中的敏感個資 (包含陣列與深層物件)
   */
  private static sanitizeValue(value: unknown): unknown {
    if (typeof value === "string") {
      return DeidentifierService.anonymizeForLogs(value);
    }
    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.sanitizeValue(value.message),
        stack: typeof value.stack === "string" ? this.sanitizeValue(value.stack) : undefined
      };
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }
    if (value !== null && typeof value === "object") {
      const res: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (/^(authorization|token|jwt|secret|apiKey|password|api_key|access_token|refresh_token|private_key)$/i.test(k)) {
          res[k] = "[REDACTED_SECRET]";
        } else {
          res[k] = this.sanitizeValue(v);
        }
      }
      return res;
    }
    return value;
  }

  /**
   * 遞迴遮蔽 metadata 中的個資
   */
  private static sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
    return (this.sanitizeValue(data) as Record<string, unknown>) || {};
  }
}
