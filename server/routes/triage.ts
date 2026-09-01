import { Router, Request, Response } from "express";
import { defaultGeminiProvider } from "../../src/ai/providers/GeminiProvider.js";
import { UNIVERSAL_SYLLOGISM_RULES } from "../../src/prompts/universal-syllogism.js";
import { buildIntelligentRuleBasedTriage } from "../../src/lib/universalTriage.js";
import { precheckLegalInput } from "../../src/lib/legalInputPrecheck.js";
import { LEGAL_TOOLS } from "../../src/lib/legalToolRegistry.js";

const router = Router();

router.post("/api/triage/universal", async (req: Request, res: Response) => {
  const { userNarrative, query, role } = req.body;
  const rawInput = userNarrative || query || "";
  if (!rawInput || typeof rawInput !== "string") {
    return res.status(400).json({ error: "請輸入案件敘述或法律諮詢問題" });
  }

  const precheck = precheckLegalInput(rawInput);
  if (precheck.status === "reject") {
    return res.status(422).json({
      error: "輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截",
      issues: precheck.issues
    });
  }

  const toolsSummary = LEGAL_TOOLS.map(t => `- [${t.id}] ${t.name}（${t.categoryLabel}）：${t.shortDesc}`).join("\n");

  const triagePrompt = `你是一位全領域精準法律診斷專家兼司法程序架構師。
請根據當事人或委任人之案件敘述，以嚴謹的中華民國實務法理與程序法為基礎進行全能導診分流。特別注意：
1. 若案件同時涉及民事（如侵權賠償）與刑事（如竊盜、傷害、詐欺、性侵害等）責任，請務必精準指認，並於 detectedDomain 中明確填寫 "CRIMINAL_AND_CIVIL"。
2. 尤其是性侵害案件（如強制性交），不僅構成刑事犯罪，亦嚴重侵害被害人之性自主權與身體人格權，必定同時伴隨民法第184條、第195條之民事侵權損害賠償（精神慰撫金）責任，請務必辨識為雙軌案件，並推薦相關民事求償或刑事附帶民事訴訟工具。

【本系統已內建之訴訟工具庫（共 ${LEGAL_TOOLS.length} 項）】：
${toolsSummary}

【當事人案件事實敘述】：
"""
${rawInput}
"""
身分角色：${role || "未指定"}

請輸出標準 JSON 格式（勿包含 markdown 標籤或額外文字）：
{
  "detectedDomain": "CRIMINAL_AND_CIVIL", // 請依案件性質填寫：CIVIL (純民事), CRIMINAL (純刑事), CRIMINAL_AND_CIVIL (民刑雙軌), ADMINISTRATIVE (行政) 等
  "domainTitle": "刑事竊盜與民事損害賠償", // 根據案件性質自訂精確標題
  "recommendedTools": [
    {
      "toolId": "工具 ID",
      "toolTitle": "工具名稱",
      "reason": "具體推薦理由",
      "urgency": "HIGH"
    }
  ],
  "syllogism": {
    "majorPremise": "大前提法律規範與核心構成要件（若涉刑案，務必點出罪名與構成要件）",
    "minorPremise": "小前提案件關鍵事實審查",
    "subsumption": "涵攝過程與爭點比對",
    "conclusion": "法律效果、程序指引與權益處分（包含刑事告訴與民事求償途徑）"
  },
  "actionableRoadmap": [
    "具體第一步行動（如：報警/驗傷/存證）",
    "第二步行動",
    "第三步行動"
  ],
  "missingFacts": ["待釐清或補正的事實要件清單"]
}`;

  const fullPrompt = `${triagePrompt}\n\n${UNIVERSAL_SYLLOGISM_RULES}`;

  try {
    const aiRes = await defaultGeminiProvider.generate(fullPrompt);
    let parsed: any;
    try {
      const cleaned = aiRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildIntelligentRuleBasedTriage(rawInput);
    }
    res.json(parsed);
  } catch (err: any) {
    console.warn("[TriageUniversal] AI 降級至本機規則分流引擎:", err.message);
    const fallback = buildIntelligentRuleBasedTriage(rawInput);
    res.json(fallback);
  }
});

export default router;
