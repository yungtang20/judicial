import { describe, expect, it } from 'vitest';
import { enforceTriageConsistency } from './universalTriage';

/**
 * 詐欺類案件不得被歸為純民事。
 *
 * 實測正式站：輸入「我被假投資平台騙了80萬」，模型判為 CIVIL，
 * UI 因此顯示「💼 純民事事件（民事損害賠償/調解，無刑事責任）」，
 * 而同一份回應卻引用刑法第339條（詐欺）。
 *
 * 這是實質誤導：詐欺為告訴乃論，被害人須自知悉犯人之日起
 * 6 個月內提出告訴（刑事訴訟法第244條）。
 * 看到「無刑事責任」的當事人可能因此不報警，
 * 放任刑訴時效經過，連民事求償都失去基礎。
 */

function 建立(查詢字串, 覆寫: Record<string, unknown> = {}) {
  return enforceTriageConsistency(
    {
      caseType: 'CIVIL',
      category: 'CIVIL_TORT_GENERAL',
      legalBasis: ['民法第184條', '民法第197條'],
      statuteAnalysis: '一般侵權分析。',
      ...覆寫,
    },
    查詢字串,
  );
}

describe('詐欺類案件的訴訟性質', () => {
  it.each([
    '我被假投資平台騙了80萬，說是穩賺不賠，匯款後就找不到人。',
    '接到假冒檢察官電話說我涉案的，要我匯款到安全帳戶。',
    '網路買東西被騙錢，賣家收錢不出貨。',
    '投資App說保證獲利，我匯款後對方消失。',
  ])('「%s」不得被判為純民事', 查詢 => {
    const 結果 = 建立(查詢);
    expect(結果.caseType, '詐欺是刑事告訴乃論，不得標為 CIVIL').not.toBe('CIVIL');
    expect(結果.caseType).toMatch(/^CRIMINAL/);
  });

  it('必須標示 6 個月告訴時效', () => {
    const 結果 = 建立('我被假投資平台騙了80萬。');
    expect(結果.litigationNatureText).toContain('6 個月');
    expect(結果.litigationNatureText).toContain('報警');
  });

  it('模型已判為刑事時仍必須補上時效警示', () => {
    // 實測：caseType 已是 CRIMINAL 時分類正確，但 litigationNatureText
    // 沒有 6 個月時效，UI 便顯示該文字而非預設的時效警告，提示又漏掉。
    const 結果 = 建立('我被假投資平台騙了80萬。', {
      caseType: 'CRIMINAL',
      litigationNatureText: '本案涉及刑事責任。',
    });
    expect(結果.caseType).toBe('CRIMINAL');
    expect(結果.litigationNatureText).toContain('6 個月');
    expect(結果.litigationNatureText).toContain('報警');
  });

  it('已判刑事時不得改動模型選定的類別', () => {
    const 結果 = 建立('我被網路詐騙騙走50萬。', { caseType: 'CRIMINAL_COMPLAINT_REQUIRED' });
    expect(結果.caseType).toBe('CRIMINAL_COMPLAINT_REQUIRED');
  });

  it('應指向詐欺刑事告訴狀工具', () => {
    const 結果 = 建立('我被網路詐騙騙走50萬。');
    expect(結果.category).toBe('CRIMINAL_COMPLAINT_FRAUD');
    expect(結果.recommendedToolId).toBe('CRIMINAL_COMPLAINT_FRAUD');
  });

  it('模型已抓到刑法339條時應補上告訴時效法源', () => {
    const 結果 = 建立('我被騙了。', { legalBasis: ['刑法第339條（詐欺罪）'] });
    expect(結果.legalBasis?.join()).toContain('244');
  });

  it('已判為刑事的案件不得被改寫', () => {
    const 原始 = 建立('我被騙了。', { caseType: 'CRIMINAL_PUBLIC' });
    expect(原始.caseType).toBe('CRIMINAL_PUBLIC');
  });

  it('真正的民事糾紛不得被誤判為詐欺', () => {
    // 房東押金、借錢不還等是純民事，不得因為「不還錢」就說人家詐欺
    for (const 查詢 of [
      '退租時房東說押金要扣兩萬才退，但我沒弄壞任何東西。',
      '朋友借我30萬有借據，兩年了聯絡不上。',
    ]) {
      const 結果 = 建立(查詢);
      expect(結果.caseType, `${查詢} 應維持民事`).toBe('CIVIL');
    }
  });

  describe('盜刷冒用等未經授權案件', () => {
    const 盜刷案情 = '我在115年09月10日發現錢包不見，9月20日銀行通知信用卡有一筆2萬元盜刷消費，但我並沒有消費。';
    it('應判為詐欺刑事告訴而非純民事', () => {
      const 結果 = 建立(盜刷案情);
      expect(結果.caseType).toMatch(/^CRIMINAL/);
      expect(結果.category).toBe('CRIMINAL_COMPLAINT_FRAUD');
    });
    it('未授權消費亦同', () => {
      const 結果 = 建立('信用卡出現一筆我未授權的消費3萬元。');
      expect(結果.caseType).toMatch(/^CRIMINAL/);
    });
    it('法源必須包含刑法339條與告訴時效', () => {
      const 結果 = 建立(盜刷案情);
      expect(結果.legalBasis.join()).toContain('339');
      expect(結果.legalBasis.join()).toContain('244');
    });
    it('行動建議必須包含報警與掛失爭議款', () => {
      const 結果 = 建立(盜刷案情);
      expect((結果.suggestedActions || []).join()).toContain('報案');
      expect((結果.suggestedActions || []).join()).toContain('掛失');
    });
    it('犯人不明時須加註時效起算', () => {
      const 結果 = 建立(盜刷案情);
      expect(結果.statuteOfLimitations).toContain('知悉犯人');
    });
  });

  it('錢包遺失加否認交易亦屬詐欺未用盜刷字眼', () => {
    const 結果 = 建立('上週錢包不見了，昨天銀行說信用卡有一筆兩萬元消費，但我並沒有消費。');
    expect(結果.caseType).toMatch(/^CRIMINAL/);
    expect(結果.category).toBe('CRIMINAL_COMPLAINT_FRAUD');
  });

  it('類別為通用占位時亦須改寫為詐欺', () => {
    const 結果 = 建立('信用卡被盜刷了五萬元。', { category: 'UNIVERSAL_AI_PLEADING' });
    expect(結果.category).toBe('CRIMINAL_COMPLAINT_FRAUD');
  });
});
