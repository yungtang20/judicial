import { describe, it, expect } from 'vitest';
import { filterSensitiveKeywords, evaluateLegalProcess } from './legalProcessClassifier';

describe('legalProcessClassifier', () => {
  it('should detect sexual assault keywords accurately', () => {
    const text = '我在睡覺時被摸下體，對方還企圖強吻性交';
    const result = filterSensitiveKeywords(text);
    expect(result.hasSexualAssaultKeywords).toBe(true);
    expect(result.hasIncapacitatedKeywords).toBe(true);
    expect(result.detectedKeywords).toContain('睡覺');
    expect(result.detectedKeywords).toContain('摸下體');
    expect(result.detectedKeywords).toContain('強吻');
    expect(result.detectedKeywords).toContain('性交');
  });

  it('should detect domestic violence keywords accurately', () => {
    const text = '我老公常常動手毆打我，甚至拿刀恐嚇威脅要殺我';
    const result = filterSensitiveKeywords(text);
    expect(result.hasDomesticViolenceKeywords).toBe(true);
    expect(result.detectedKeywords).toContain('動手');
    expect(result.detectedKeywords).toContain('毆打');
  });

  it('should classify spouse sleeping assault as SEXUAL_ASSAULT and public prosecution', () => {
    const input = {
      scenarioCategory: 'SEXUAL_HARM',
      narrative: '我老婆佩容在我睡覺時含住我的陰莖口交',
      relationship: 'SPOUSE' as const,
      characteristics: ['SEXUAL_INVASION', 'INCAPACITATED'],
      urgencyFlags: {
        inImmediateDanger: false,
        needsMedicalOrInjury: true,
        happenedWithin72Hours: true
      }
    };
    const result = evaluateLegalProcess(input);
    expect(result.primaryCategory).toBe('SEXUAL_ASSAULT');
    expect(result.isHighRiskSafety).toBe(true);
    expect(result.isPublicProsecution).toBe(true);
    expect(result.requiresImmediateProtection).toBe(true);
    expect(result.statuteCitations.some(c => c.includes('225'))).toBe(true);
    expect(result.safetyGuidelines.some(g => g.includes('72小時'))).toBe(true);
    expect(result.safetyGuidelines.some(g => g.includes('113'))).toBe(true);
    expect(result.recommendedPaths.some(p => p.targetToolId === 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT')).toBe(true);
  });

  it('should classify domestic physical abuse as DOMESTIC_VIOLENCE with protection order path', () => {
    const input = {
      scenarioCategory: 'DOMESTIC',
      narrative: '我前夫今天跑來我家掐脖子毆打我，把我打到受傷流血',
      relationship: 'EX_PARTNER' as const,
      characteristics: ['PHYSICAL_VIOLENCE'],
      urgencyFlags: {
        inImmediateDanger: true,
        needsMedicalOrInjury: true,
        happenedWithin72Hours: true
      }
    };
    const result = evaluateLegalProcess(input);
    expect(result.primaryCategory).toBe('DOMESTIC_VIOLENCE');
    expect(result.isHighRiskSafety).toBe(true);
    expect(result.requiresImmediateProtection).toBe(true);
    expect(result.statuteCitations.some(c => c.includes('家庭暴力防治法'))).toBe(true);
    expect(result.recommendedPaths.some(p => p.targetToolId === 'DOMESTIC_VIOLENCE_PROTECTION_ORDER')).toBe(true);
  });

  it('should classify spouse wallet theft as PROPERTY_CRIME with 6-month tell warning', () => {
    const input = {
      scenarioCategory: 'PROPERTY',
      narrative: '我在睡覺時，我老婆佩容拿走我的錢包並刷卡',
      relationship: 'SPOUSE' as const,
      characteristics: ['THEFT_FRAUD'],
      urgencyFlags: {
        inImmediateDanger: false,
        needsMedicalOrInjury: false,
        happenedWithin72Hours: false
      }
    };
    const result = evaluateLegalProcess(input);
    expect(result.primaryCategory).toBe('PROPERTY_CRIME');
    expect(result.isHighRiskSafety).toBe(false);
    expect(result.statuteCitations.some(c => c.includes('320'))).toBe(true);
    expect(result.statuteCitations.some(c => c.includes('324'))).toBe(true);
    expect(result.safetyGuidelines.some(g => g.includes('6個月'))).toBe(true);
  });
});
