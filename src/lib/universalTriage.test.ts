import { describe, it, expect } from 'vitest';
import { buildIntelligentRuleBasedTriage, precheckLegalInput } from './universalTriage';

describe('universalTriage', () => {
  it('should correctly classify spouse sexual assault', () => {
    const query = '我老婆佩容強壓我的頭去舔她的陰蒂，我明確拒絕並反抗';
    const result = buildIntelligentRuleBasedTriage(query);
    
    expect(result.detectedDomain).toBe('CRIMINAL_AND_CIVIL');
    expect(result.statuteAnalysis).not.toContain('767');
    expect(result.statuteAnalysis).toMatch(/221|224/);
    expect(result.statuteAnalysis).toContain('229');
    expect(result.litigationNatureText).toContain('告訴乃論');
    expect(result.isPublicProsecution).toBe(false);
  });
});
