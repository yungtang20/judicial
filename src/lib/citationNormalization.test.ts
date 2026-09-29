import { describe, expect, it } from 'vitest';
import { normalizeStatuteCitation, isLiveVerified } from './citationRelevance';

/**
 * 法條引用的正規化決定「已查驗」與「不可引用」兩個區塊的分流。
 *
 * 實測缺陷：同一條法條在畫面上同時出現於兩處，自相矛盾：
 *   可能涉及的法條：民法第184條第1項前段（侵權損害賠償…）  ← 標示「全國法規資料庫」
 *   不可引用：民法第184條（侵權行為）                        ← 「不得用於書狀或法律主張」
 *
 * 原因：原本只剝括號與空白，項次（前段／第1項）造成鍵不相等，去重失效。
 * 使用者同時看到「已確認」與「不得使用」兩種互斥指示，無從判斷該用哪一個。
 */
describe('法條引用的正規化', () => {
  it('同一條法條的項次變體必須正規化為同一個鍵', () => {
    // 這一組是實測畫面上同時出現於兩個區塊的引用。
    const 主要清單 = '民法第184條第1項前段（侵權損害賠償，請求不當得利時適用）';
    const 不可引用清單 = '民法第184條（侵權行為）';
    expect(normalizeStatuteCitation(主要清單)).toBe(normalizeStatuteCitation(不可引用清單));
  });

  it('第N項、第N款與純條文視為同一條', () => {
    expect(normalizeStatuteCitation('民法第179條第1項')).toBe(normalizeStatuteCitation('民法第179條'));
    expect(normalizeStatuteCitation('民法第474條第2款')).toBe(normalizeStatuteCitation('民法第474條'));
  });

  it('括號說明仍被剝除（既有行為不得回歸）', () => {
    expect(normalizeStatuteCitation('刑法第315條之1（妨害秘密罪）'))
      .toBe(normalizeStatuteCitation('刑法第315條之1'));
  });

  it('不同條號不得被合併', () => {
    // 去重要精確，不能把第179條與第184條視為同一條。
    expect(normalizeStatuteCitation('民法第179條')).not.toBe(normalizeStatuteCitation('民法第184條'));
  });

  it('不同法名不得被合併', () => {
    expect(normalizeStatuteCitation('民法第184條')).not.toBe(normalizeStatuteCitation('民事訴訟法第184條'));
  });

  it('條之N 不得被當成主條', () => {
    // 「第1113條之10」與「第1113條」是不同條文，不能因去重而混為一談。
    expect(normalizeStatuteCitation('民法第1113條之10')).not.toBe(normalizeStatuteCitation('民法第1113條'));
  });
});

describe('已查驗判定不會因變體而失效', () => {
  const 官方狀態 = [{ citation: '民法第184條', status: 'VERIFIED' }];

  it('主要清單的項次寫法應視為已查驗', () => {
    // 未修正前，這裡會回 false，於是該條被丟進「不可引用」區塊。
    expect(isLiveVerified(官方狀態, '民法第184條第1項前段（侵權損害賠償）')).toBe(true);
  });

  it('括號說明的寫法應視為已查驗', () => {
    expect(isLiveVerified(官方狀態, '民法第184條（侵權行為）')).toBe(true);
  });

  it('未查證的其他條文仍不得被視為已查驗', () => {
    expect(isLiveVerified(官方狀態, '民法第179條')).toBe(false);
  });
});
