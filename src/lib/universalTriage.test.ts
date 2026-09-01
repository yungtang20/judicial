import { describe, expect, it } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

describe('buildIntelligentRuleBasedTriage high-risk classifications', () => {
  it('classifies a pet injury as a civil dispute', () => {
    const result = buildIntelligentRuleBasedTriage('鄰居的狗咬傷我的貓');

    expect(result.category).toBe('CIVIL_PET_DISPUTE');
    expect(result.caseType).toBe('CIVIL');
    expect(result.isPublicProsecution).toBe(false);
    expect(result.timeLimit).toContain('2 年');
    expect(result.legalBasis).toContain('民法第190條第1項（動物占有人侵權責任）');
  });

  it('classifies sexual assault as a public prosecution offence', () => {
    const result = buildIntelligentRuleBasedTriage('遭到非自願性行為，對方還拍攝影片，行為人是丈夫');

    expect(result.category).toBe('CRIMINAL_COMPLAINT_SEXUAL_ASSAULT');
    expect(result.isPublicProsecution).toBe(true);
    expect(result.timeLimit).toContain('無6個月限制');
    expect(result.legalBasis).toContain('刑法第221條（強制性交罪）');
    expect(result.recommendedTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolId: 'CRIMINAL_COMPLAINT_PRIVACY' }),
        expect.objectContaining({ toolId: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER' })
      ])
    );
  });

  it('distinguishes an injury traffic accident from a property-only accident', () => {
    const injury = buildIntelligentRuleBasedTriage('車禍撞傷我，有驗傷單');
    const propertyOnly = buildIntelligentRuleBasedTriage('車禍只有車輛財物損失');

    expect(injury.category).toBe('CRIMINAL_COMPLAINT_TRAFFIC');
    expect(injury.isPublicProsecution).toBe(false);
    expect(injury.timeLimit).toContain('6 個月');
    expect(propertyOnly.category).toBe('CIVIL_TORT_GENERAL');
    expect(propertyOnly.isPublicProsecution).toBe(false);
    expect(propertyOnly.timeLimit).toContain('2 年');
  });

  it('classifies a handed-over bank card scam as a public prosecution offence', () => {
    const result = buildIntelligentRuleBasedTriage('我被假貸款騙去寄提款卡和密碼');

    expect(result.category).toBe('CRIMINAL_COMPLAINT_FRAUD');
    expect(result.isPublicProsecution).toBe(true);
    expect(result.timeLimit).toContain('無6個月限制');
    expect(result.legalBasis.join(' ')).toContain('洗錢防制法');
  });

  it('covers the family exception in theft classification', () => {
    const result = buildIntelligentRuleBasedTriage('同居親屬偷走我的手機');

    expect(result.category).toBe('CRIMINAL_COMPLAINT_THEFT');
    expect(result.isPublicProsecution).toBe(true);
    expect(result.timeLimit).toContain('同居親屬');
    expect(result.statuteAnalysis).toContain('刑法第324條');
  });
});
