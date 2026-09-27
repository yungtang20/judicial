// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { classifyTemplateP9Readiness, synchronizeP9Statuses } from './officialTemplateManifest';

/**
 * 讀取範本清單不得因寫入失敗而中斷。
 *
 * 實測：loadManifest() 在偵測到 P9 狀態需要降級時會寫回 manifest.json。
 * 正式環境常見唯讀或唯讀掛載的檔案系統，fs.writeFileSync 會直接丟出例外，
 * 讓整個官方法律範本功能不可用。
 *
 * 記憶體中的降級才是 fail-closed 的關鍵：本次執行仍會拒絕交付。
 * 寫回只是讓下次啟動不必重新偵測，失敗不影響正確性。
 */
const 完整範本 = (覆寫: Record<string, unknown> = {}) => ({
  id: 'TPL-1',
  category: '民事',
  templateStatus: 'READY_FOR_MERGE',
  localFilePath: 'data/official-templates/files/a.odt',
  localFileHash: 'a'.repeat(64),
  p9SourceHash: 'a'.repeat(64),
  p9SourceOfficialUpdatedAt: '2026-01-01',
  officialUpdatedAt: '2026-01-01',
  fields: [{ key: 'plaintiff', label: '原告' }],
  p9ProfileId: 'CIVIL_244',
  p9ProfileVersion: '1.0.0',
  p9Status: 'P9_READY',
  ...覆寫
}) as never;

describe('範本 P9 狀態的降級判定', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('來源雜湊與檔案不符時必須降級', () => {
    const 範本 = [完整範本()];
    const 變更 = synchronizeP9Statuses(範本, () => 'b'.repeat(64));
    expect(變更).toBe(true);
    expect((範本[0] as unknown as { p9Status: string }).p9Status).toBe('P9_BLOCKED');
  });

  it('官方更新日期不一致時必須降級', () => {
    const 範本 = [完整範本({ p9SourceOfficialUpdatedAt: '2025-01-01' })];
    expect(synchronizeP9Statuses(範本, () => 'a'.repeat(64))).toBe(true);
    expect((範本[0] as unknown as { p9Status: string }).p9Status).toBe('P9_BLOCKED');
  });

  it('綁定一致時不得降級', () => {
    const 範本 = [完整範本()];
    expect(synchronizeP9Statuses(範本, () => 'a'.repeat(64))).toBe(false);
    expect((範本[0] as unknown as { p9Status: string }).p9Status).toBe('P9_READY');
  });

  it('缺少欄位對應時分類為未設定', () => {
    const r = classifyTemplateP9Readiness(完整範本({
      p9Status: 'P9_NOT_CONFIGURED', fields: []
    }));
    expect(r.status).toBe('P9_NOT_CONFIGURED');
    expect(r.reasons).toContain('FIELD_MAPPING_NOT_CONFIGURED');
  });

  it('缺少來源雜湊時分類為未設定', () => {
    const r = classifyTemplateP9Readiness(完整範本({
      p9Status: 'P9_NOT_CONFIGURED', localFileHash: ''
    }));
    expect(r.reasons).toContain('SOURCE_HASH_UNAVAILABLE');
  });

  it('缺少 P9 設定檔時分類為未設定', () => {
    const r = classifyTemplateP9Readiness(完整範本({
      p9Status: 'P9_NOT_CONFIGURED', p9ProfileId: ''
    }));
    expect(r.reasons).toContain('P9_PROFILE_NOT_CONFIGURED');
  });

  it('其餘條件齊備但尚未核准時為已阻擋', () => {
    const r = classifyTemplateP9Readiness(完整範本({ p9Status: 'P9_BLOCKED' }));
    expect(r.status).toBe('P9_BLOCKED');
    expect(r.reasons).toEqual([]);
  });
});

const 唯讀範本 = JSON.stringify([{
  id: 'TPL-RO',
  category: '民事',
  templateStatus: 'READY_FOR_MERGE',
  localFilePath: 'data/official-templates/files/a.odt',
  localFileHash: 'a'.repeat(64),
  p9SourceHash: 'a'.repeat(64),
  p9SourceOfficialUpdatedAt: '2026-01-01',
  officialUpdatedAt: '2026-01-01',
  fields: [{ key: 'plaintiff', label: '原告' }],
  p9ProfileId: 'CIVIL_244',
  p9ProfileVersion: '1.0.0',
  p9Status: 'P9_READY'
}]);

vi.mock('fs', () => {
  // 只替換會被用到的三個方法，其餘沿用實際模組
  const 實際 = vi.importActual<typeof import('fs')>('fs');
  const 覆寫 = {
    existsSync: () => true,
    readFileSync: () => 唯讀範本,
    // 唯讀檔案系統：任何寫入都丟出 EROFS
    writeFileSync: () => { throw new Error('EROFS: read-only file system'); }
  };
  return { ...實際, ...覆寫, default: { ...(實際 as never as Record<string, unknown>), ...覆寫 } };
});

describe('範本清單的讀取不得依賴可寫入的檔案系統', () => {
  it('寫回失敗時仍應完成載入並保留降級後的狀態', async () => {
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const 模組 = await import('./officialTemplateManifest');

    let 清單: { templates: Array<{ p9Status: string }> } | undefined;
    // 重點：不得丟出例外
    expect(() => { 清單 = 模組.loadManifest() as unknown as { templates: Array<{ p9Status: string }> }; }).not.toThrow();
    expect(清單).toBeDefined();

    // 記憶體中的降級仍必須生效——這是 fail-closed 的關鍵
    expect(清單!.templates[0].p9Status, '寫入失敗不得影響記憶體中的降級').toBe('P9_BLOCKED');
    expect(警告).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
