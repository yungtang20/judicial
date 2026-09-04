import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all external dependencies before importing the module
vi.mock("../../src/ai/providers/providerRegistry.js", () => ({
  defaultAIProvider: {
    generate: vi.fn().mockResolvedValue({ text: "mocked LLM response" }),
  },
}));

vi.mock("./legalRetrieval.js", () => ({
  retrieve: vi.fn().mockResolvedValue([]),
}));

vi.mock("./legalGenerationPipeline.js", () => ({
  defaultLegalRetrievalService: {
    retrieveContext: vi.fn().mockResolvedValue({ promptBlock: "" }),
  },
}));

vi.mock("../../src/lib/citationVerifier.js", () => ({
  verifyLegalCitations: vi.fn().mockReturnValue({
    sanitizedText: "test response",
    totalChecked: 0,
    ghostCount: 0,
  }),
}));

vi.mock("../../src/lib/universalTriage.js", () => ({
  buildIntelligentRuleBasedTriage: vi.fn().mockReturnValue({
    identifiedIssue: "test",
    caseType: "CIVIL_GENERAL",
    category: "CIVIL_GENERAL",
    legalBasis: [],
    isSensitive: false,
  }),
  enforceTriageConsistency: vi.fn().mockImplementation((_payload: any) => ({
    ..._payload,
    isSensitive: false,
  })),
}));

vi.mock("../../src/lib/deidentifier.js", () => ({
  scrubPersonalInfo: vi.fn().mockImplementation((text: string) => text),
}));

vi.mock("./judicialDataFetcher.js", () => ({
  fetchFromOpenData: vi.fn().mockResolvedValue({ success: false }),
}));

vi.mock("./judicialServiceHours.js", () => ({
  isWithinServiceHours: vi.fn().mockReturnValue({ withinHours: false }),
}));

// Import after mocking
import { handleAgentChat } from "../services/agentChat.js";

describe("AgentChat Route — 輸入驗證與回應結構", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENT_CHAT_ENABLED = "true";
  });

  afterEach(() => {
    delete process.env.AGENT_CHAT_ENABLED;
  });

  it("空白 userInput 回傳 success=false 與錯誤訊息", async () => {
    const result = await handleAgentChat({
      userInput: "",
      history: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("請輸入您的問題。");
  });

  it("純空白字串 userInput 回傳 success=false", async () => {
    const result = await handleAgentChat({
      userInput: "   ",
      history: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("請輸入您的問題。");
  });

  it("正常輸入回傳完整回應結構", async () => {
    const result = await handleAgentChat({
      userInput: "什麼是民法第184條？",
      history: [],
    });

    expect(result.success).toBe(true);
    expect(result.reply).toBeDefined();
    expect(typeof result.reply).toBe("string");
    expect(result.disclaimer).toBeDefined();
    expect(result.usedRetrieval).toBeDefined();
    expect(result.sourceProvider).toBeDefined();
    expect(result.gateStatus).toBeDefined();
  });

  it("回應包含免責聲明", async () => {
    const result = await handleAgentChat({
      userInput: "什麼是民法第184條？",
      history: [],
    });

    expect(result.success).toBe(true);
    expect(result.disclaimer).toContain("輔助性工具");
    expect(result.disclaimer).toContain("不構成法律意見");
  });

  it("回應的 gateStatus 為有效值", async () => {
    const result = await handleAgentChat({
      userInput: "什麼是民法第184條？",
      history: [],
    });

    expect(result.success).toBe(true);
    expect(["PASS", "NEEDS_REVIEW", "FAIL"]).toContain(result.gateStatus);
  });

  it("回應的 sourceProvider 為有效值", async () => {
    const result = await handleAgentChat({
      userInput: "什麼是民法第184條？",
      history: [],
    });

    expect(result.success).toBe(true);
    expect(["tlr", "opendata", "local", "none"]).toContain(
      result.sourceProvider
    );
  });

  it("帶有歷史紀錄時仍正常回應", async () => {
    const result = await handleAgentChat({
      userInput: "請問刑法第271條的刑度是什麼？",
      history: [
        {
          role: "user",
          content: "請問殺人罪的構成要件？",
          timestamp: "2026-09-01T10:00:00Z",
        },
        {
          role: "assistant",
          content: "殺人罪規定於刑法第271條...",
          timestamp: "2026-09-01T10:00:05Z",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.reply).toBeDefined();
  });
});
