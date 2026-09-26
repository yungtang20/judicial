import { describe, it, expect } from 'vitest';
import { LEGAL_TOOLS } from './legalToolRegistry';
import { isSelectableDocument } from './documentCatalog';
import { isCourtPleadingToolCategory } from './finalGate/pleadingExportGate';
import { getCourtPleadingConfig } from './rules/courtPleadingRuleProfiles';

/**
 * 不變量：任何在 UI 可選的法院書狀類別，都必須有對應的 canonical 設定。
 *
 * 背景：`CRIMINAL_COMPLAINT_TRAFFIC`（刑事告訴狀線上產生器）曾經
 * `selectionEnabled: true` 但 `generationPath: 'UNSUPPORTED'`，
 * 使用者可以在工具箱選到它、填完表單按下產製，卻必定收到 422 P9_FINAL_GATE_FAILED。
 * 這類缺陷不會讓任何測試失敗，必須靠這條不變量把它釘死。
 */
describe('document catalog 與 canonical 規則檔的一致性', () => {
  const courtPleadingIds = [...new Set(LEGAL_TOOLS.map(tool => tool.id))].filter(isCourtPleadingToolCategory);

  it('UI 可選的法院書狀類別都必須有 canonical 設定', () => {
    const missing = courtPleadingIds.filter(isSelectableDocument).filter(id => getCourtPleadingConfig(id) === null);
    expect(missing).toEqual([]);
  });

  it('可選的法院書狀類別數量不得為零（避免守門條件失效而測試仍通過）', () => {
    expect(courtPleadingIds.filter(isSelectableDocument).length).toBeGreaterThan(0);
  });

  it('沒有 canonical 設定的類別一律不得開放選取', () => {
    const incorrectlySelectable = courtPleadingIds.filter(id => !isSelectableDocument(id) === false && getCourtPleadingConfig(id) === null);
    expect(incorrectlySelectable).toEqual([]);
  });

  it('刑事告訴狀在補齊核准結構前維持停用', () => {
    // 明確釘住目前的處理方式：停用選取，但條目本身仍存在且需要 P9 授權。
    expect(isSelectableDocument('CRIMINAL_COMPLAINT_TRAFFIC')).toBe(false);
  });
});
