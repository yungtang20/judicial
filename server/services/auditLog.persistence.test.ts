// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { describePersistence, isEphemeralDisk } from './auditLog.js';

/**
 * 健康檢查不得對稽核記錄的持久性過度宣稱。
 *
 * 實測：健康檢查回報 durable: true，管理者會據此認為稽核記錄
 * 能長期留存。但本專案的部署目標 Render 免費方案使用短暫檔案系統，
 * 重新部署即清除所有資料。
 *
 * 健康檢查正是管理者判斷稽核記錄可信度的地方，
 * 不可僅以「寫入磁碟而非記憶體」就宣稱為持久保存。
 *
 * 判斷邏輯已抽為純函式 describePersistence 供獨立測試。
 * 先前的測試依賴服務的執行期狀態，而測試環境使用 :memory:，
 * 核心斷言整段被跳過——正是本專案一路在清理的那種空轉測試。
 */
describe('稽核持久性的判定', () => {
  it('寫入磁碟但部署於短暫磁碟時，不得宣稱可跨重啟保留', () => {
    const r = describePersistence('sqlite', 'D:/data/audit_logs.sqlite', true);
    expect(r.durable).toBe(true);
    expect(r.survivesRestart, '短暫磁碟不得宣稱可跨重啟保留').toBe(false);
    expect(r.caveat).toContain('短暫磁碟');
  });

  it('寫入磁碟且非短暫磁碟時，可宣稱可跨重啟保留', () => {
    const r = describePersistence('sqlite', '/var/data/audit_logs.sqlite', false);
    expect(r.durable).toBe(true);
    expect(r.survivesRestart).toBe(true);
  });

  it('記憶體模式一律不得宣稱持久', () => {
    for (const 磁碟 of [true, false]) {
      const r = describePersistence('sqlite', ':memory:', 磁碟);
      expect(r.durable).toBe(false);
      expect(r.survivesRestart).toBe(false);
      expect(r.caveat).toContain('記憶體');
    }
  });

  it('未指定路徑時視為不持久', () => {
    const r = describePersistence('sqlite', undefined, false);
    expect(r.durable).toBe(false);
    expect(r.survivesRestart).toBe(false);
  });

  it('即使宣稱可保留，仍須提供限制說明', () => {
    const r = describePersistence('sqlite', '/var/data/a.sqlite', false);
    expect(r.caveat.length).toBeGreaterThan(0);
    // 容器暫存空間仍可能遺失，不可暗示絕對安全
    expect(r.caveat).toContain('掛載持久磁碟');
  });

  it('每一種組合都必須有可讀的限制說明', () => {
    const 組合: Array<[Parameters<typeof describePersistence>[0], string | undefined, boolean]> = [
      ['sqlite', '/a.sqlite', true],
      ['sqlite', '/a.sqlite', false],
      ['sqlite', ':memory:', false],
      ['memory', undefined, false]
    ];
    for (const [mode, path, ephemeral] of 組合) {
      const r = describePersistence(mode, path, ephemeral);
      expect(r.caveat, `${mode}/${path}/${ephemeral} 缺少說明`).toBeTruthy();
      expect(typeof r.survivesRestart).toBe('boolean');
    }
  });
});

describe('部署環境的短暫磁碟偵測', () => {
  afterEach(() => {
    delete process.env.RENDER;
  });

  it('Render 環境視為短暫磁碟', () => {
    process.env.RENDER = 'true';
    expect(isEphemeralDisk()).toBe(true);
  });

  it('非 Render 環境不視為短暫磁碟', () => {
    delete process.env.RENDER;
    expect(isEphemeralDisk()).toBe(false);
  });
});
