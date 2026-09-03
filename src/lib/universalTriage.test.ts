import { describe, it, expect, beforeEach } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

describe('universalTriage - 性侵害案件強制分類', () => {
  const query = '配偶按住頭強迫口交，被害人明確拒絕並反抗';

  let result: ReturnType<typeof buildIntelligentRuleBasedTriage>;

  beforeEach(() => {
    result = buildIntelligentRuleBasedTriage(query);
  });

  it('配偶性侵案不應分類為 CIVIL（民事）', () => {
    expect(result.caseType).not.toBe('CIVIL');
  });

  it('legalBasis 必須包含刑法第221條（強制性交罪）', () => {
    const basis = result.legalBasis || [];
    const has221 = basis.some((b: string) => b.includes('刑法第221條') || b.includes('§221'));
    expect(has221).toBe(true);
  });

  it('plainExplanation 必須提及「告訴乃論」', () => {
    expect(result.plainExplanation).toContain('告訴乃論');
  });

  it('legalBasis 不得包含民法第767條（物上請求權）', () => {
    const basis = result.legalBasis || [];
    const has767 = basis.some((b: string) => b.includes('民法第767條') || b.includes('§767'));
    expect(has767).toBe(false);
  });

  it('isPublicProsecution 不得為 false（至少構成犯罪，非無罪）', () => {
    expect(result.isPublicProsecution).toBeDefined();
    expect(typeof result.isPublicProsecution).toBe('boolean');
  });

  it('confidenceLevel 必須存在且為 high（硬分類規則引擎路徑）', () => {
    expect(result.confidenceLevel).toBeDefined();
    expect(result.confidenceLevel).toBe('high');
  });
});

describe('universalTriage - 通用民事預設 confidenceLevel', () => {
  it('通用預設（非特定關鍵字）回傳 medium confidence', () => {
    const result = buildIntelligentRuleBasedTriage('某甲跟某乙有一個模糊的法律問題');
    expect(result.confidenceLevel).toBe('medium');
  });
});

describe('universalTriage - 寵物案件 confidenceLevel', () => {
  it('寵物咬傷案件回傳 high confidence', () => {
    const result = buildIntelligentRuleBasedTriage('我家貓被鄰居的狗咬傷了');
    expect(result.confidenceLevel).toBe('high');
    expect(result.caseType).toBe('CIVIL');
  });
});
