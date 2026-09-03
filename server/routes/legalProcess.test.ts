// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import legalProcessRouter from "./legalProcess.js";
import {
  buildRouterPrompt,
  buildQuestioningPrompt,
  buildSyllogismEnginePrompt
} from "../../src/prompts/legalProcessPrompts.js";

describe("3-Node Legal Process Pipeline", { timeout: 15000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(legalProcessRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe("Node 1: Router Prompt & API", () => {
    it("builds router prompt adhering to strict JSON output rules and criteria", () => {
      const prompt = buildRouterPrompt("有人在我熟睡時摸我");
      expect(prompt).toContain("你是一位法律案件分流與事實評估專家");
      expect(prompt).toContain('"domain": "刑事/民事/家事/行政"');
      expect(prompt).toContain('"chapter":');
      expect(prompt).toContain('"cause":');
      expect(prompt).toContain('"is_sensitive": true/false');
      expect(prompt).toContain('"is_complete": true/false');
      expect(prompt).toContain('"missing_elements":');
      expect(prompt).toContain("is_sensitive：若案情涉及性侵害、家庭暴力、跟蹤騷擾，必須為 true");
    });

    it("evaluates sensitive cases with is_sensitive: true via API", async () => {
      const res = await fetch(`${baseUrl}/api/process/router`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: "配偶趁我熟睡意識不清時，未經同意性交並動手毆打我。"
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.is_sensitive).toBe(true);
      expect(typeof body.data.is_complete).toBe("boolean");
      expect(Array.isArray(body.data.missing_elements)).toBe(true);
    });
  });

  describe("Node 2: Questioning Prompt & API", () => {
    it("builds questioning prompt with 1~2 concrete questions and button options", () => {
      const prompt = buildQuestioningPrompt(["發生時間", "是否有驗傷證明"], "被打傷了");
      expect(prompt).toContain("你是一位富有同理心的法律諮詢助手");
      expect(prompt).toContain("先簡短確認目前理解的現狀");
      expect(prompt).toContain("說明為什麼需要補充這些資訊");
      expect(prompt).toContain("附上 2~3 個 [選項按鈕]");
    });

    it("generates questions and suggested button options via API", async () => {
      const res = await fetch(`${baseUrl}/api/process/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missingElements: ["具體發生時間與地點", "加害人關係"],
          userInput: "我被借錢不還"
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.rawMessage).toBeDefined();
      expect(Array.isArray(body.data.suggestedOptions)).toBe(true);
    });
  });

  describe("Node 3: Syllogism Engine Prompt & API", () => {
    it("builds syllogism prompt requiring major/minor premise, subsumption, and conclusion", () => {
      const prompt = buildSyllogismEnginePrompt("刑法第221條強制性交構成要件", "被害人明確拒絕遭暴力壓制");
      expect(prompt).toContain("你是一位資深法律分析專家");
      expect(prompt).toContain("【大前提（構成要件）】：");
      expect(prompt).toContain("【小前提（案件事實）】：");
      expect(prompt).toContain("1. 大前提：簡述適用法條與構成要件");
      expect(prompt).toContain("2. 小前提：簡述用戶輸入的相關事實與證據");
      expect(prompt).toContain("3. 涵攝：逐一比對事實與要件");
      expect(prompt).toContain("4. 結論：給出初步法律評估與下一步行動建議");
      expect(prompt).toContain("絕對禁止編造用戶未提供的事實");
    });

    it("executes syllogism analysis via API", async () => {
      const res = await fetch(`${baseUrl}/api/process/syllogism`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userFacts: "房客租約已到期兩個月，拒絕搬離且積欠兩個月租金。",
          queryTopic: "租賃契約終止與返還房屋"
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.analysis).toBeDefined();
      expect(body.data.legalElements).toBeDefined();
    });
  });
});
