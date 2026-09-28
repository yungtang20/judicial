import { describe, expect, it } from 'vitest';
import { enforceTriageConsistency, buildIntelligentRuleBasedTriage } from './universalTriage';

/**
 * 分類規則必須對「所有」產出路徑生效。
 *
 * 實測：詐欺案件在 AI 降級時走的是 buildIntelligentRuleBasedTriage，
 * 該路徑未經過 enforceTriageConsistency，於是被判為 CIVIL，
 * UI 顯示「💼 純民事事件（民事損害賠償/調解，無刑事責任）」。
 *
 * 這是同一個誤導的另一個入口——只修 AI 路徑等於漏掉一半。
 * 規則本身是確定性的（只看查詢字串與既有法源），
 * 對降級輸出同樣適用，且成本為零。
 */
describe('分類規則對所有產出路徑生效', () => {
  const 查詢 = '我被假投資平台騙了80萬，匯款後就找不到人。';

  it('規則導向的降級輸出同樣不得判為純民事', () => {
    const 降級輸出 = buildIntelligentRuleBasedTriage(查詢);
    // 先確認降級引擎本身確實會判成民事（否則本測試沒意義）
    expect(降級輸出.caseType).toBe('CIVIL');

    // 再確認規則能把它修正過來
    const 修正後 = enforceTriageConsistency(降級輸出, 查詢);
    expect(修正後.caseType).not.toBe('CIVIL');
    expect(修正後.litigationNatureText).toContain('6 個月');
  });

  it('降級路徑下的房東押金仍維持民事', () => {
    const 押金查詢 = '退租時房東說押金要扣兩萬才退，但我沒弄壞任何東西。';
    const 降級輸出 = buildIntelligentRuleBasedTriage(押金查詢);
    const 修正後 = enforceTriageConsistency(降級輸出, 押金查詢);
    expect(修正後.caseType).toBe('CIVIL');
  });

  it('規則對已正確的輸出不得造成破壞', () => {
    const 輸入 = '我在便利商店打工，被指認偷東西。';
    const 降級輸出 = buildIntelligentRuleBasedTriage(輸入);
    const 修正後 = enforceTriageConsistency(降級輸出, 輸入);
    expect(修正後.caseType).toBe(降級輸出.caseType);
  });
});
