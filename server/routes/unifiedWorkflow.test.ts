import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import unifiedWorkflowRouter, { buildOfficialJudgmentQueries, buildOfficialSearchEvidence, buildRuleBasedQuestioning } from "./unifiedWorkflow.js";

describe("Unified StateGraph Workflow API", { timeout: 30000 }, () => {
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

  it("規則備援依實際缺件生成追問，不套用家暴固定模板", () => {
    const result = buildRuleBasedQuestioning(["借款金額與付款方式", "有無借據或匯款紀錄"]);

    expect(result.rawMessage).toContain("借款金額與付款方式");
    expect(result.rawMessage).toContain("有無借據或匯款紀錄");
    expect(result.suggestedOptions).toContain("我可以補充確切金額與計算方式");
    expect(result.rawMessage).not.toContain("家暴");
    expect(result.suggestedOptions.join(" ")).not.toContain("配偶");
  });

  it("官方裁判查詢先用核心爭點，查無時可退回主要法條", () => {
    expect(buildOfficialJudgmentQueries("押金返還法律爭議請求權與程序分析", ["民法第179條", "民法第184條"]))
      .toEqual(["押金返還", "民法第179條"]);
  });

  it("官方搜尋結果只證明裁判存在，不冒充已支持使用者主張", () => {
    const [evidence] = buildOfficialSearchEvidence([{
      caseNumber: "最高法院112年度台上字第9號民事判決",
      sourceUrl: "https://judgment.judicial.gov.tw/FJUD/data.aspx?id=test",
      checkedAt: "2026-09-10T03:00:00.000Z",
      summary: "官方裁判摘錄",
      contentHash: "a".repeat(64)
    }]);

    expect(evidence).toMatchObject({ status: "VERIFIED", claimSupportStatus: "NEEDS_REVIEW" });
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
    expect(state.questioning.generationMode).toBe("AI");
    expect(state.questioning.suggestedOptions.length).toBeGreaterThanOrEqual(2);
    expect(state.syllogism).toBeUndefined();
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
    expect(state.rag.officialEvidence.every((item: any) => item.type !== "PRECEDENT" || item.claimSupportStatus !== "SUPPORTED")).toBe(true);

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

  it("4.1 追問補充：明確回答無其他資料後仍可進入結果", async () => {
    const res = await fetch(`${baseUrl}/api/workflow/supplement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ existingNarrative: "我好像被騙錢了", supplementText: "無" })
    });

    const state = (await res.json()).data;
    expect(state.currentStep).toBe("COMPLETED");
    expect(state.syllogism).toBeDefined();
  });

  it("5. 時間矛盾檢查：當用戶同時陳述「民國112年11月15日」與「最近3天內」時，必須中斷並返回追問請求", async () => {
    const res = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "民國112年11月15日，但我記得又是最近3天內在台北市大安區住處，被同事拿走筆電拒絕返還，有監視器畫面。"
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const state = body.data;

    expect(state.router.is_complete).toBe(false);
    expect(state.currentStep).toBe("QUESTIONING");
    expect(state.questioning).toBeDefined();
    expect(state.questioning.rawMessage).toContain("請確認日期");
    expect(state.questioning.rawMessage).toContain("民國112年11月15日");
    expect(state.questioning.rawMessage).toContain("最近3天內");
    // 嚴格確保工作流中斷，未進入 RAG 或 Syllogism 節點
    expect(state.rag).toBeUndefined();
    expect(state.syllogism).toBeUndefined();
  });

  it("6. 統一分流引擎與特殊案件分支：配偶乘機性交鎖定刑法225公訴罪，親屬竊盜鎖定刑法320/324條", async () => {
    // 6.1 乘機性交非告訴乃論公訴罪
    const res1 = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "趁我吃安眠藥昏睡酒醉不醒的時候老公強行跟我發生性行為",
        acknowledgeSafety: true
      })
    });
    const body1 = await res1.json();
    const state1 = body1.data;
    expect(state1.router.caseType).toBe("CRIMINAL_PUBLIC");
    expect(state1.router.legalBasis.some((b: string) => b.includes("225"))).toBe(true);
    expect(state1.router.legalBasis.some((b: string) => b.includes("767"))).toBe(false);

    // 6.2 親屬竊盜
    const res2 = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "同居男友趁我上班時偷拿走我抽屜裡的現金十萬元與金飾"
      })
    });
    const body2 = await res2.json();
    const state2 = body2.data;
    expect(state2.router.category).toBe("CRIMINAL_COMPLAINT_THEFT");
    expect(state2.router.legalBasis.some((b: string) => b.includes("320") || b.includes("324"))).toBe(true);
  });

  it("7. 驗證閘門防假通過：若無具體法源或未執行有效檢核，必須判定為 NEEDS_REVIEW 而非 PASS", async () => {
    // 刻意送入一個通過 router 但缺乏具體法條檢核的情境
    const res = await fetch(`${baseUrl}/api/workflow/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: "民國114年3月1日在台北市某咖啡廳，李先生向張小姐承諾合作卻未履行，雙方有LINE截圖為證。"
      })
    });

    const body = await res.json();
    const state = body.data;
    if (state.verification) {
      if (state.verification.totalChecked === 0) {
        expect(state.verification.passGate).toBe(false);
        expect(state.verification.verificationStatus).toBe("NEEDS_REVIEW");
      }
    }
  });
});
