/**
 * 稽核資料飛輪端點測試：GET /api/audit/flywheel
 * 驗證租戶隔離、分頁讀取、與 summarizeAuditFailures 接線正確
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const getLogsByTenantMock = vi.hoisted(() =>
  vi.fn((tenantId: string, limit?: number, offset?: number) => ({ total: 0, logs: [] }))
);

vi.mock('../services/auditLog.js', () => ({
  AuditLogService: {
    getLogsByTenant: (tenantId: string, limit?: number, offset?: number) =>
      getLogsByTenantMock(tenantId, limit, offset)
  }
}));

import { auditRouter } from './audit.js';

function buildApp(withTenant: boolean) {
  const app = express();
  app.use(express.json());
  if (withTenant) {
    app.use((req: any, _res, next) => {
      req.tenantContext = { tenantId: 'tenant_a', isSystemAdmin: false };
      next();
    });
  }
  app.use(auditRouter);
  return app;
}

describe('GET /api/audit/flywheel', () => {
  const app = buildApp(true);

  beforeEach(() => {
    getLogsByTenantMock.mockReset();
    getLogsByTenantMock.mockImplementation((tenantId: string, limit: number, offset: number) => {
      const all = [
        { action: 'POST', resource: '/api/toolbox/generate', status: 'FAILURE', statusCode: 422 },
        { action: 'POST', resource: '/api/toolbox/generate', status: 'FAILURE', statusCode: 422 },
        { action: 'GET', resource: '/api/health', status: 'SUCCESS', statusCode: 200 }
      ];
      return { total: all.length, logs: all.slice(offset, offset + limit) };
    });
  });

  it('回傳 summary：失敗群組排序與佔比正確', async () => {
    const res = await request(app).get('/api/audit/flywheel');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenantId).toBe('tenant_a');
    expect(res.body.sampled).toBe(3);
    expect(res.body.summary.failureCount).toBe(2);
    expect(res.body.top[0].resource).toBe('/api/toolbox/generate');
    expect(res.body.top[0].count).toBe(2);
  });

  it('?format=report 回傳純文字週報', async () => {
    const res = await request(app).get('/api/audit/flywheel?format=report');
    expect(res.status).toBe(200);
    expect(typeof res.body.report).toBe('string');
    expect(res.body.report).toContain('/api/toolbox/generate');
  });

  it('全成功紀錄：summary 零失敗、report 顯示無待修項目', async () => {
    getLogsByTenantMock.mockImplementation(() => ({
      total: 1,
      logs: [{ action: 'GET', resource: '/api/health', status: 'SUCCESS', statusCode: 200 }]
    }));
    const res = await request(app).get('/api/audit/flywheel?format=report');
    expect(res.status).toBe(200);
    expect(res.body.report).toContain('無失敗紀錄');
  });

  it('未取得 tenantContext 時回 401', async () => {
    const app2 = buildApp(false);
    const res = await request(app2).get('/api/audit/flywheel');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
