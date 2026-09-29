import { describe, expect, it } from 'vitest';
import { AuditLogService } from './auditLog';

/**
 * 稽核資料庫的位置不得對外公開絕對路徑。
 *
 * 實測缺陷：未經認證的 /api/health 回傳
 *   "path": "/opt/render/project/src/data/audit_logs.sqlite"
 * 等於公開部署的檔案系統結構，便於外部 reconnaissance。
 * 專案已有 staticExposure.test.ts 對這類洩漏有防護意圖，
 * 但稽核路徑不在其涵蓋範圍。
 *
 * 持久化的布林狀態與說明文字是對外有用且誠實的
 * （管理者需要知道稽核記錄是否會消失），不該一併移除——只拿掉路徑。
 */
describe('稽核資料庫路徑的揭露範圍', () => {
  it('對外描述不得包含絕對路徑', () => {
    const 描述 = AuditLogService.getPersistenceStatus() as
      { path?: string; durable?: boolean; caveat?: string };
    if (描述.path !== undefined) {
      expect(描述.path, `對外輸出了路徑：${描述.path}`).not.toMatch(/[\\/]/);
      expect(描述.path).not.toMatch(/^\//);
      expect(描述.path).not.toContain('opt');
      expect(描述.path).not.toContain('render');
    }
  });

  it('仍應保留管理者判斷所需的持久化資訊', () => {
    const 描述 = AuditLogService.getPersistenceStatus() as
      { durable?: boolean; survivesRestart?: boolean; caveat?: string };
    // 直接移除整段會讓管理者看不到「稽核記錄是否會消失」，
    // 那是本專案刻意揭露的部署限制，屬有用的資訊。
    expect(描述).toHaveProperty('durable');
    expect(描述).toHaveProperty('survivesRestart');
    expect(描述).toHaveProperty('caveat');
  });
});
