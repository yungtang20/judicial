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
請根據當事人或委任人之案件敘述，以嚴謹的中華民國實務法理與程序法為基礎進行全能導診分流。

【本系統已內建之訴訟工具庫（共 ${LEGAL_TOOLS.length} 項）】：
${toolsSummary}

【當事人案件事實敘述】：
"""
${rawInput}
"""
身分角色：${role || "未指定"}

請輸出標準 JSON 格式（勿包含 markdown 標籤或額外文字）：
{
  "detectedDomain": "CIVIL",
  "domainTitle": "民事訴訟與損害賠償",
  "recommendedTools": [
    {
      "toolId": "工具 ID",
      "toolTitle": "工具名稱",
      "reason": "具體推薦理由",
      "urgency": "HIGH"
    }
  ],
  "syllogism": {
    "majorPremise": "大前提法律規範與核心構成要件",
    "minorPremise": "小前提案件關鍵事實審查",
    "subsumption": "涵攝過程與爭點比對",
    "conclusion": "法律效果、程序指引與權益處分"
  },
  "actionableRoadmap": [
    "具體第一步行動",
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
