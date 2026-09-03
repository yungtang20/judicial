import { describe, it, expect } from "vitest";
import { enforceTriageConsistency, buildIntelligentRuleBasedTriage } from "../../src/lib/universalTriage.js";

describe("Triage Prompt & Consistency Rules", () => {
  it("1. 敏感案件強制保護路徑：家暴或性侵害案件應強制設定 isSensitive 與 protectionNotice", () => {
    const rawInput = "昨晚在住處前夫動手毆打我，搶走手機並威脅要散布私密照片，我非常害怕。";
    const initialPayload = {
      identifiedIssue: "家庭暴力與恐嚇危害安全",
      caseType: "CRIMINAL_PUBLIC",
      legalBasis: ["刑法第277條", "刑法第305條"]
    };

    const evaluated = enforceTriageConsistency(initialPayload, rawInput);
    expect(evaluated.isSensitive).toBe(true);
    expect(evaluated.protectionNotice).toContain("113 保護專線");
    expect(evaluated.protectionNotice).toContain("敏感案件保護提醒");
  });

  it("2. 領域鎖定與防污染：刑事性自主/家暴案件嚴禁混入勞動法條", () => {
    const rawInput = "遭遇性侵害乘機性交案件";
    const contaminatedPayload = {
      identifiedIssue: "乘機性交",
      isSensitive: true,
      category: "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT",
      caseType: "CRIMINAL_PUBLIC",
      legalBasis: ["刑法第225條", "勞動基準法第14條", "民法第767條", "公司法第23條"]
    };

    const cleaned = enforceTriageConsistency(contaminatedPayload, rawInput);
    expect(cleaned.legalBasis).toContain("刑法第225條");
    expect(cleaned.legalBasis).not.toContain("勞動基準法第14條");
    expect(cleaned.legalBasis).not.toContain("民法第767條");
    expect(cleaned.legalBasis).not.toContain("公司法第23條");
  });

  it("3. 本機規則引擎對於欠缺完整事實時，可適配推薦與要素分析", () => {
    const result = buildIntelligentRuleBasedTriage("我借了朋友一筆錢，結果現在到期了對方都不還我");
    expect(result.identifiedIssue).toBeDefined();
    expect(result.legalBasis.length).toBeGreaterThan(0);
    expect(result.recommendedToolId).toBeDefined();
  });
});
