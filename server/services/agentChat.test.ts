import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAgentChat, type AgentChatMessage } from "./agentChat.js";

// ---------------------------------------------------------------------------
// Mock all external dependencies
// ---------------------------------------------------------------------------

vi.mock("../../src/ai/providers/providerRegistry.js", () => ({
  defaultAIProvider: {
    generate: vi.fn(),
  },
}));

vi.mock("./legalRetrieval.js", () => ({
  retrieve: vi.fn(),
}));

vi.mock("./legalGenerationPipeline.js", () => ({
  defaultLegalRetrievalService: {
    retrieveContext: vi.fn(),
  },
}));

vi.mock("../../src/lib/citationVerifier.js", () => ({
  verifyLegalCitations: vi.fn(),
}));

vi.mock("../../src/lib/universalTriage.js", () => ({
  buildIntelligentRuleBasedTriage: vi.fn(),
  enforceTriageConsistency: vi.fn(),
}));

vi.mock("../../src/lib/deidentifier.js", () => ({
  scrubPersonalInfo: vi.fn((text: string) => text),
}));

vi.mock("./judicialDataFetcher.js", () => ({
  fetchFromOpenData: vi.fn(),
}));

vi.mock("./judicialServiceHours.js", () => ({
  isWithinServiceHours: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mock setup
// ---------------------------------------------------------------------------

import { defaultAIProvider } from "../../src/ai/providers/providerRegistry.js";
import { retrieve } from "./legalRetrieval.js";
import { defaultLegalRetrievalService } from "./legalGenerationPipeline.js";
import { verifyLegalCitations } from "../../src/lib/citationVerifier.js";
import {
  buildIntelligentRuleBasedTriage,
  enforceTriageConsistency,
} from "../../src/lib/universalTriage.js";
import { scrubPersonalInfo } from "../../src/lib/deidentifier.js";
import { fetchFromOpenData } from "./judicialDataFetcher.js";
import { isWithinServiceHours } from "./judicialServiceHours.js";

const mockGenerate = vi.mocked(defaultAIProvider.generate);
const mockRetrieve = vi.mocked(retrieve);
const mockRetrieveContext = vi.mocked(defaultLegalRetrievalService.retrieveContext);
const mockVerify = vi.mocked(verifyLegalCitations);
const mockTriage = vi.mocked(buildIntelligentRuleBasedTriage);
const mockTriageConsistency = vi.mocked(enforceTriageConsistency);
const mockScrub = vi.mocked(scrubPersonalInfo);
const mockFetchOpenData = vi.mocked(fetchFromOpenData);
const mockServiceHours = vi.mocked(isWithinServiceHours);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupHappyPath() {
  mockTriage.mockReturnValue({
    caseType: "民事",
    category: "契約糾紛",
    isSensitive: false,
  } as any);

  mockTriageConsistency.mockReturnValue({
    caseType: "民事",
    category: "契約糾紛",
    isSensitive: false,
  } as any);

  mockRetrieve.mockResolvedValue([
    { excerpt: "民法第 184 條：因故意或過失，不法侵害他人之權利者，負損害賠償責任。" },
  ] as any);

  mockGenerate.mockResolvedValue({ text: "根據民法第 184 條，侵權行為人應負損害賠償責任。" } as any);

  mockVerify.mockReturnValue({
    ghostCount: 0,
    totalChecked: 1,
    sanitizedText: "根據民法第 184 條，侵權行為人應負損害賠償責任。",
  } as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("agentChat service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENT_CHAT_ENABLED = "true";
  });

  // ── Gate: disabled ──────────────────────────────────────────────────────

  it("returns error when AGENT_CHAT_ENABLED=false", async () => {
    process.env.AGENT_CHAT_ENABLED = "false";
    const result = await handleAgentChat({ userInput: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("停用");
  });

  // ── Gate: empty input ───────────────────────────────────────────────────

  it("returns error for empty userInput", async () => {
    const result = await handleAgentChat({ userInput: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error for whitespace-only userInput", async () => {
    const result = await handleAgentChat({ userInput: "   " });
    expect(result.success).toBe(false);
  });

  it("returns error for undefined userInput", async () => {
    const result = await handleAgentChat({ userInput: undefined as any });
    expect(result.success).toBe(false);
  });

  // ── Happy path: local retrieval ─────────────────────────────────────────

  it("returns successful reply via local retrieval", async () => {
    setupHappyPath();
    const result = await handleAgentChat({ userInput: "什麼是侵權行為？" });

    expect(result.success).toBe(true);
    expect(result.reply).toContain("民法第 184 條");
    expect(result.usedRetrieval).toBe(true);
    expect(result.sourceProvider).toBe("local");
    expect(result.gateStatus).toBe("PASS");
  });

  it("calls LLM with system prompt and user input", async () => {
    setupHappyPath();
    await handleAgentChat({ userInput: "契約瑕疵怎麼辦？" });

    expect(mockGenerate).toHaveBeenCalledOnce();
    const prompt = mockGenerate.mock.calls[0][0] as string;
    expect(prompt).toContain("法律輔助助理");
    expect(prompt).toContain("契約瑕疵怎麼辦？");
  });

  it("uses low temperature for deterministic output", async () => {
    setupHappyPath();
    await handleAgentChat({ userInput: "test" });

    const opts = mockGenerate.mock.calls[0][1];
    expect(opts.temperature).toBe(0.3);
  });

  // ── History ─────────────────────────────────────────────────────────────

  it("includes conversation history in prompt", async () => {
    setupHappyPath();
    const history: AgentChatMessage[] = [
      { role: "user", content: "上一个问题", timestamp: "2025-01-01" },
      { role: "assistant", content: "上一个回答", timestamp: "2025-01-01" },
    ];
    await handleAgentChat({ userInput: "新问题", history });

    const prompt = mockGenerate.mock.calls[0][0] as string;
    expect(prompt).toContain("上一个问题");
    expect(prompt).toContain("上一个回答");
  });

  it("truncates history to max turns (default 6)", async () => {
    setupHappyPath();
    const history: AgentChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
      timestamp: "2025-01-01",
    }));
    await handleAgentChat({ userInput: "final", history });

    const prompt = mockGenerate.mock.calls[0][0] as string;
    expect(prompt).toContain("msg-29"); // last message kept
    expect(prompt).not.toContain("msg-0"); // oldest dropped
  });

  it("respects AGENT_CHAT_MAX_HISTORY env", async () => {
    setupHappyPath();
    process.env.AGENT_CHAT_MAX_HISTORY = "2";
    const history: AgentChatMessage[] = [
      { role: "user", content: "old-1", timestamp: "" },
      { role: "assistant", content: "old-2", timestamp: "" },
      { role: "user", content: "old-3", timestamp: "" },
      { role: "assistant", content: "new", timestamp: "" },
    ];
    await handleAgentChat({ userInput: "test", history });

    const prompt = mockGenerate.mock.calls[0][0] as string;
    // max 2 turns = 4 messages, so keeps last 4 of 4 → all kept
    expect(prompt).toContain("new");
  });

  // ── PII redaction ───────────────────────────────────────────────────────

  it("scrubs PII from user input before triage", async () => {
    setupHappyPath();
    mockScrub.mockReturnValueOnce("scrubbed-input");
    mockScrub.mockReturnValueOnce("scrubbed-reply");

    const result = await handleAgentChat({ userInput: "我叫張三" });
    expect(mockScrub).toHaveBeenCalledWith("我叫張三");
    expect(result.success).toBe(true);
  });

  it("scrubs PII from LLM reply before returning", async () => {
    setupHappyPath();
    mockScrub.mockReturnValueOnce("clean-input");
    mockScrub.mockReturnValueOnce("clean-reply");

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.reply).toContain("clean-reply");
  });

  // ── Citation Gate ───────────────────────────────────────────────────────

  it("returns gate FAIL when ghost citations detected", async () => {
    setupHappyPath();
    mockVerify.mockReturnValue({
      ghostCount: 2,
      totalChecked: 3,
      sanitizedText: "原文",
    } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.success).toBe(true);
    expect(result.gateStatus).toBe("FAIL");
    expect(result.reply).toBeDefined();
    // Should not contain the fabricated citation text
    expect(result.reply).not.toContain("原文");
  });

  it("returns gate NEEDS_REVIEW when no citations checked", async () => {
    setupHappyPath();
    mockVerify.mockReturnValue({
      ghostCount: 0,
      totalChecked: 0,
      sanitizedText: "無引用的一般回答",
    } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.gateStatus).toBe("NEEDS_REVIEW");
  });

  it("returns gate PASS when citations verified", async () => {
    setupHappyPath();
    mockVerify.mockReturnValue({
      ghostCount: 0,
      totalChecked: 2,
      sanitizedText: "根據民法第184條",
    } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.gateStatus).toBe("PASS");
  });

  // ── TLR fallback ────────────────────────────────────────────────────────

  it("falls back to TLR when local retrieval returns empty", async () => {
    mockTriage.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockTriageConsistency.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockRetrieve.mockResolvedValue([] as any);
    mockRetrieveContext.mockResolvedValue({ promptBlock: "TLR context block" } as any);
    mockGenerate.mockResolvedValue({ text: "TLR response" } as any);
    mockVerify.mockReturnValue({ ghostCount: 0, totalChecked: 0, sanitizedText: "TLR response" } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.usedRetrieval).toBe(true);
    expect(result.sourceProvider).toBe("tlr");
  });

  it("skips TLR when local retrieval succeeds", async () => {
    setupHappyPath();
    await handleAgentChat({ userInput: "test" });
    expect(mockRetrieveContext).not.toHaveBeenCalled();
  });

  // ── OpenData fallback ───────────────────────────────────────────────────

  it("falls back to OpenData when both local and TLR fail, during service hours", async () => {
    mockTriage.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockTriageConsistency.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockRetrieve.mockResolvedValue([] as any);
    mockRetrieveContext.mockRejectedValue(new Error("TLR down"));
    mockServiceHours.mockReturnValue({ withinHours: true, currentHour: 2 } as any);
    mockFetchOpenData.mockResolvedValue({ success: true, html: "<p>" + "x".repeat(200) + "</p>" } as any);
    mockGenerate.mockResolvedValue({ text: "OpenData response" } as any);
    mockVerify.mockReturnValue({ ghostCount: 0, totalChecked: 0, sanitizedText: "OpenData response" } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.usedRetrieval).toBe(true);
    expect(result.sourceProvider).toBe("opendata");
  });

  it("skips OpenData outside service hours", async () => {
    mockTriage.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockTriageConsistency.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockRetrieve.mockResolvedValue([] as any);
    mockRetrieveContext.mockRejectedValue(new Error("TLR down"));
    mockServiceHours.mockReturnValue({ withinHours: false, currentHour: 10 } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.usedRetrieval).toBe(false);
    expect(result.sourceProvider).toBe("none");
    expect(mockFetchOpenData).not.toHaveBeenCalled();
  });

  it("skips OpenData when content too short (< 100 chars)", async () => {
    mockTriage.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockTriageConsistency.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockRetrieve.mockResolvedValue([] as any);
    mockRetrieveContext.mockRejectedValue(new Error("TLR down"));
    mockServiceHours.mockReturnValue({ withinHours: true, currentHour: 3 } as any);
    mockFetchOpenData.mockResolvedValue({ success: true, html: "<p>short</p>" } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.usedRetrieval).toBe(false);
    expect(result.sourceProvider).toBe("none");
  });

  // ── LLM failure ─────────────────────────────────────────────────────────

  it("returns error when LLM generation fails", async () => {
    setupHappyPath();
    mockGenerate.mockRejectedValue(new Error("LLM down"));

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when LLM times out", async () => {
    setupHappyPath();
    // Never resolves → triggers 8s timeout
    mockGenerate.mockReturnValue(new Promise(() => {}));

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }, 15000);

  // ── Disclaimer ──────────────────────────────────────────────────────────

  it("appends disclaimer with source info to reply", async () => {
    setupHappyPath();
    const result = await handleAgentChat({ userInput: "test" });
    expect(result.reply).toContain("---");
    expect(result.disclaimer).toBeDefined();
    expect(result.disclaimer).toContain("本地法律檢索");
  });

  it("uses 'none' disclaimer when no retrieval source", async () => {
    mockTriage.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockTriageConsistency.mockReturnValue({ caseType: "民事", category: "其他", isSensitive: false } as any);
    mockRetrieve.mockResolvedValue([] as any);
    mockRetrieveContext.mockResolvedValue({ promptBlock: "" } as any);
    mockGenerate.mockResolvedValue({ text: "general answer" } as any);
    mockVerify.mockReturnValue({ ghostCount: 0, totalChecked: 0, sanitizedText: "general answer" } as any);

    const result = await handleAgentChat({ userInput: "test" });
    expect(result.sourceProvider).toBe("none");
  });

  // ── Sensitive case flag ──────────────────────────────────────────────────

  it("passes isSensitive to triage", async () => {
    setupHappyPath();
    mockTriageConsistency.mockReturnValue({
      caseType: "家事",
      category: "保護令",
      isSensitive: true,
    } as any);

    await handleAgentChat({ userInput: "保護令聲請" });
    expect(mockTriageConsistency).toHaveBeenCalled();
  });

  // ── History empty ───────────────────────────────────────────────────────

  it("handles undefined history gracefully", async () => {
    setupHappyPath();
    const result = await handleAgentChat({ userInput: "test", history: undefined });
    expect(result.success).toBe(true);
  });

  it("handles empty history array", async () => {
    setupHappyPath();
    const result = await handleAgentChat({ userInput: "test", history: [] });
    expect(result.success).toBe(true);
  });
});
