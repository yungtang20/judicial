import { describe, it, expect } from 'vitest';
import { buildIntelligentRuleBasedTriage, enforceTriageConsistency } from './universalTriage';

describe('universalTriage', () => {
  it('should correctly classify spouse sleeping sexual assault (Article 225, Non-Tell)', () => {
    const query = '我睡覺的時候被我的老婆佩容含住陰莖後性交';
    const result = buildIntelligentRuleBasedTriage(query);
    
    expect(result.detectedDomain).toBe('CRIMINAL_AND_CIVIL');
    expect(result.statuteAnalysis).not.toContain('767');
    expect(result.statuteAnalysis).toContain('225');
    expect(result.statuteAnalysis).not.toContain('229');
        expect(result.litigationNatureText).toContain('非告訴乃論');
    expect(result.isPublicProsecution).toBe(true);
  });

  it('should correctly classify spouse forced sexual assault (Article 221/224, Tell)', () => {
    const query = '我老婆強壓我的頭去舔她的陰蒂，我明確拒絕並反抗';
    const result = buildIntelligentRuleBasedTriage(query);
    
    expect(result.detectedDomain).toBe('CRIMINAL_AND_CIVIL');
    expect(result.statuteAnalysis).not.toContain('767');
    expect(result.statuteAnalysis).toMatch(/221|224/);
    expect(result.statuteAnalysis).toContain('229');
    expect(result.litigationNatureText).toContain('告訴乃論');
    expect(result.isPublicProsecution).toBe(false);
  });

  it('should enforce consistency on LLM hallucinated payload (Spouse + 225)', () => {
    
    const hallucinatedLLMPayload = {
      category: "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT",
      isPublicProsecution: false,
      litigationNatureText: "⚡ 刑事告訴乃論（刑法第229條之1）",
      legalBasis: ["刑法第225條（乘機性交猥褻罪）", "刑法第229條之1（對配偶犯妨害性自主罪之告訴乃論）", "民法第767條"],
      statuteAnalysis: "刑法第225條、刑法第229條之1、民法第767條"
    };
    const query = "我老婆趁我睡覺時...";
    const corrected = enforceTriageConsistency(hallucinatedLLMPayload, query);
    
    // Assert Rule 1: 225 is forced to be public prosecution
    expect(corrected.isPublicProsecution).toBe(true);
    expect(corrected.litigationNatureText).toContain('非告訴乃論');
    expect(corrected.litigationNatureText).toContain('配偶身分不影響本罪之公訴性質');
    expect(corrected.legalBasis.some(b => b.includes('229條之1'))).toBe(false);
    expect(corrected.statuteAnalysis).not.toContain('229條之1');
    
    // Assert Rule 2: 767 is stripped
    expect(corrected.legalBasis.some(b => b.includes('767'))).toBe(false);
    expect(corrected.statuteAnalysis).not.toContain('767');
  });

});
