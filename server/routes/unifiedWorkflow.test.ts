import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import unifiedWorkflowRouter from "./unifiedWorkflow.js";

describe("Unified StateGraph Workflow API", { timeout: 15000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(unifiedWorkflowRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it("1. 邊界條件：資訊不完整時 (is_complete == false) 應導向 QuestioningNode 生成動態追問與快捷選項", async () => {
    const res = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "我好像被騙錢了"
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const state = body.data;

    expect(state.router).toBeDefined();
    expect(state.router.is_complete).toBe(false);
    expect(state.currentStep).toBe("QUESTIONING");
    expect(state.questioning).toBeDefined();
    expect(state.questioning.rawMessage).toBeDefined();
    expect(Array.isArray(state.questioning.suggestedOptions)).toBe(true);
  });

  it("2. 邊界條件：涉敏感案件時 (is_sensitive == true) 應導向保護路徑 (SAFETY_PROTECTION)", async () => {
    const res = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "昨天晚上我在住處遭到前夫動手毆打，威脅要把我的私密照發布出去"
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const state = body.data;

    expect(state.router).toBeDefined();
    expect(state.router.is_sensitive).toBe(true);
    expect(state.currentStep).toBe("SAFETY_PROTECTION");
    expect(state.safety).toBeDefined();
    expect(state.safety.emergencyHotlines.length).toBeGreaterThan(0);
    expect(state.safety.preservationTips.length).toBeGreaterThan(0);
  });

  it("3. 完整案情：一次性走完 Router ➔ RAG ➔ Syllogism ➔ VerificationGate (含外部檢核閘門)", async () => {
    const completeCase = `民國112年11月10日上午10點，在台北市大安區和平東路租屋處。被告房東李大同拒絕退還原告新台幣6萬元押金。原告持有雙方房屋租賃合約書、歷次匯款紀錄與11月11日LINE對話截圖作為證據，依民法第184條與第179條請求返還。`;

    const res = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: completeCase
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const state = body.data;

    // 驗證狀態傳遞完整
    expect(state.router.domain).toBeDefined();
    expect(state.router.cause).toBeDefined();
    expect(state.router.is_complete).toBe(true);

    // 驗證 RAGNode 要件
    expect(state.rag).toBeDefined();
    expect(state.rag.legalElements).toBeDefined();

    // 驗證 SyllogismNode 三段論
    expect(state.syllogism).toBeDefined();
    expect(state.syllogism.fullAnalysis).toContain("大前提");
    expect(state.syllogism.fullAnalysis).toContain("小前提");
    expect(state.syllogism.fullAnalysis).toContain("涵攝");
    expect(state.syllogism.fullAnalysis).toContain("結論");

    // 驗證 VerificationGateNode 真確性檢核閘門
    expect(state.verification).toBeDefined();
    expect(typeof state.verification.totalChecked).toBe("number");
    expect(typeof state.verification.passGate).toBe("boolean");
    expect(state.currentStep).toBe("COMPLETED");
  });

  it("4. 追問補充：透過 /api/workflow/supplement 補足事實後順利推進至 COMPLETED", async () => {
    const res = await fetch(`${baseUrl}/api/workflow/supplement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        existingNarrative: "朋友借錢不還",
        supplementText: "民國112年5月1日中午，在台北市信義區朋友陳小明向我借款20萬元，我有雙方借據契約與網路銀行匯款紀錄，至今催告拒絕返還。",
        acknowledgeSafety: true
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const state = body.data;

    expect(state.router.is_complete).toBe(true);
    expect(state.syllogism).toBeDefined();
    expect(state.verification).toBeDefined();
    expect(state.currentStep).toBe("COMPLETED");
  });
});
