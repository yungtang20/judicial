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

  describe('未成年人傷害案件', () => {
    const 兒少案情 = '未成年周男在公園遭陌生男孩拍打致擦挫傷，雙方皆未滿18歲，已驗傷提告。';
    it('行為人未成年須納入少年事件處理法', () => {
      const 結果 = enforceTriageConsistency({ caseType: 'CIVIL', category: 'CRIMINAL_COMPLAINT_ASSAULT', legalBasis: ['刑法第277條'] }, 兒少案情);
      expect(結果.legalBasis.join()).toContain('少年事件處理法');
      expect(結果.suggestedActions.join()).toContain('法定代理人');
    });
    it('毀損訊號須納入刑法354', () => {
      const 結果 = enforceTriageConsistency({ caseType: 'CIVIL', category: 'CRIMINAL_COMPLAINT_ASSAULT', legalBasis: ['刑法第277條'] }, '腳踏車遭人丟擲草叢損壞，雙方皆未滿18歲。');
      expect(結果.legalBasis.join()).toContain('354');
    });

  describe("動物分支守衛", () => {
    it("狗嘴辱罵不得判為寵物糾紛", () => {
      const 結果 = buildIntelligentRuleBasedTriage("調解時對方辱罵閉上你的狗嘴，致心生畏懼提恐嚇告訴。");
      expect(結果.category).not.toBe("CIVIL_PET_DISPUTE");
    });
    it("傷害併恐嚇須納入刑法305", () => {
      const 結果 = buildIntelligentRuleBasedTriage("遭人作勢毆打並辱罵恐嚇致心生畏懼，提傷害及恐嚇告訴。");
      expect(結果.category).toBe("CRIMINAL_COMPLAINT_ASSAULT");
      expect(結果.legalBasis.join()).toContain("305");
    });
  });

  describe("14案矩陣迴歸", () => {
    const 分流 = (q) => enforceTriageConsistency({ caseType: "CIVIL", category: "CIVIL_TORT_GENERAL", legalBasis: ["民法第184條"] }, q);
    it("假客服詐騙判刑事詐欺", () => {
      const r = 分流("接到假客服電話，對方自稱銀行專員要求操作網銀轉帳，驚覺受騙。");
      expect(r.caseType).toMatch(/^CRIMINAL/);
    });
    it("照片盜用不判詐欺", () => {
      const r = 分流("照片遭色情網站盜用，已提個資法告訴。");
      expect(r.caseType).toBe("CIVIL");
      expect(r.legalBasis.join()).not.toContain("339");
    });
    it("十年舊案加註時效警示", () => {
      const r = 分流("105年03月15日遭人恐嚇，115年09月報案提告。");
      expect(r.statuteOfLimitations).toContain("時效抗辯");
    });
    it("跟蹤騷擾納入跟騷法", () => {
      const r = 分流("遭陌生男子尾隨搭乘電扶梯並於出口徘徊，心生畏怖提跟騷告訴。");
      expect(r.legalBasis.join()).toContain("跟蹤騷擾");
    });
    it("兒少性影像勒索納入兒少性剝削與346", () => {
      const r = 分流("未成年與網友視訊裸聊遭側錄，對方要求付錢否則散布。");
      expect(r.legalBasis.join()).toContain("性剝削");
      expect(r.legalBasis.join()).toContain("346");
    });
    it("拍打傷勢判傷害", () => {
      const r = buildIntelligentRuleBasedTriage("遭人拍打抓手致擦挫傷，已驗傷提告。");
      expect(r.category).toBe("CRIMINAL_COMPLAINT_ASSAULT");
    });
    it("毀損通用納入354", () => {
      const r = 分流("車窗遭人砸碎毀損，報案提告。");
      expect(r.legalBasis.join()).toContain("354");
    });
    it("毒品查獲定刑事", () => {
      const r = 分流("路檢查獲持有安非他命，唾液快篩陽性，依毒品罪嫌逮捕。");
      expect(r.caseType).toMatch(/^CRIMINAL/);
      expect(r.legalBasis.join()).toContain("毒品危害");
    });
    it("純家暴不帶221", () => {
      const r = 分流("夫妻口角推擠，已家暴通報。");
      expect(r.legalBasis.join()).not.toContain("221");
    });
  });
  });
});
