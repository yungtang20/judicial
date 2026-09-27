import { describe, it, expect } from 'vitest';
import { describeProsecutionLimitation } from './prosecutionLimitation';

/**
 * 追訴時效警示必須符合案件性質。
 *
 * 實測：純民事的房東押金糾紛，報告上卻掛著
 * 「⚠️ 告訴乃論（注意6個月時效）」——告訴乃論是刑事制度概念，
 * 民事契約糾紛不適用。使用者會誤以為自己的租賃糾紛面臨刑事追訴時限，
 * 進而做出不必要的急迫決定。
 */
describe('追訴時效的適用性', () => {
  it('純民事案件不得顯示刑事的告訴乃論或公訴罪', () => {
    expect(describeProsecutionLimitation('GENERAL_CIVIL', false).tone).toBe('civil');
    expect(describeProsecutionLimitation('GENERAL_CIVIL', false).label).not.toMatch(/告訴乃論|公訴罪/);
  });

  it('即使 isPublicProsecution 為 false，民事案件仍不得套用刑事時效', () => {
    // 先前的缺陷：只要不是公訴罪就顯示告訴乃論，民事案件因此被誤標
    const limitation = describeProsecutionLimitation('GENERAL_CIVIL', false);
    expect(limitation.label).toContain('民事');
  });

  it('刑事案件才適用公訴罪與告訴乃論', () => {
    expect(describeProsecutionLimitation('SEXUAL_ASSAULT', true).tone).toBe('criminal-public');
    expect(describeProsecutionLimitation('SEXUAL_ASSAULT', true).label).toContain('公訴罪');
    expect(describeProsecutionLimitation('DOMESTIC_VIOLENCE', false).tone).toBe('criminal-private');
    expect(describeProsecutionLimitation('DOMESTIC_VIOLENCE', false).label).toContain('6個月');
  });

  it('可能涉及刑事的類別仍維持原有行為', () => {
    for (const cat of ['PROPERTY_CRIME', 'TRAFFIC_ACCIDENT', 'LABOR_DISPUTE', 'GENERAL_CRIMINAL', 'DIGITAL_SEX_CRIME']) {
      expect(describeProsecutionLimitation(cat, false).tone).toBe('criminal-private');
      expect(describeProsecutionLimitation(cat, true).tone).toBe('criminal-public');
    }
  });
});
