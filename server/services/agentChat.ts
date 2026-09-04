/**
 * AgentChat Service — Stateless conversational legal assistant.
 *
 * Integrates with the existing Unified Workflow infrastructure:
 *   1. Triage the user's free-form input via universalTriage
 *   2. Retrieve relevant statutes/precedents via legalRetrieval + OpenData fallback
 *   3. Generate a concise response via LLM
 *   4. Verify legal citations before sending to user (Citation Gate)
 *   5. Redact PII from the final output
 *
 * Disabled by setting `AGENT_CHAT_ENABLED=false` (default: true).
 */

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AgentChatRequest {
  userInput: string;
  history?: AgentChatMessage[];
}

export interface AgentChatResponse {
  success: boolean;
  reply?: string;
  disclaimer?: string;
  usedRetrieval?: boolean;
  sourceProvider?: "tlr" | "opendata" | "local" | "none";
  gateStatus?: "PASS" | "NEEDS_REVIEW" | "FAIL";
  error?: string;
}

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function isEnabled(): boolean {
  const v = process.env.AGENT_CHAT_ENABLED ?? "true";
  return v !== "false";
}

function getMaxHistoryTurns(): number {
  const v = parseInt(process.env.AGENT_CHAT_MAX_HISTORY ?? "6", 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 20) : 6;
}

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

function getDisclaimer(source: "tlr" | "opendata" | "local" | "none"): string {
  const base =
    "本系統為輔助性工具，提供的分析僅供參考，不構成法律意見。如需正式法律諮詢，請諮詢專業律師。";
  const sourceMap: Record<string, string> = {
    tlr:
      "（資料來源：TW Legal RAG 本地知識庫）" ,
    opendata:
      "（資料來源：司法院法學資料檢索系統 OpenData）",
    local:
      "（資料來源：本地法律檢索）",
    none:
      "（本回覆未引用外部法律資料）",
  };
  return `${base}${sourceMap[source] ?? sourceMap.none}`;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export async function handleAgentChat(
  req: AgentChatRequest
): Promise<AgentChatResponse> {
  if (!isEnabled()) {
    return { success: false, error: "Agent Chat 已被環境變數停用。" };
  }

  const rawInput = (req.userInput ?? "").trim();
  if (!rawInput) {
    return { success: false, error: "請輸入您的問題。" };
  }

  // 1. Sanitize PII
  const userText = scrubPersonalInfo(rawInput);

  // 2. Triage (rule-based — no LLM cost)
  const baseTriage = buildIntelligentRuleBasedTriage(userText);
  const triage = enforceTriageConsistency(baseTriage, userText);

  // 3. Retrieve context (local vector store)
  let legalContext = "";
  let sourceProvider: "tlr" | "opendata" | "local" | "none" = "local";
  let usedRetrieval = false;

  try {
    const chunks = await retrieve(userText, {
      topK: 5,
      caseType: triage.caseType,
      category: triage.category,
      isSensitive: triage.isSensitive,
    });
    if (chunks.length > 0) {
      legalContext = chunks.map((c) => c.excerpt).join("\n\n");
      usedRetrieval = true;
      sourceProvider = "local";
    }
  } catch (err) {
    console.warn("[AgentChat] local retrieval failed:", err);
  }

  if (!usedRetrieval) {
    try {
      const retrieval = await defaultLegalRetrievalService.retrieveContext(userText);
      if (retrieval.promptBlock && retrieval.promptBlock.trim().length > 0) {
        legalContext = retrieval.promptBlock;
        usedRetrieval = true;
        sourceProvider = "tlr";
      }
    } catch (err) {
      console.warn("[AgentChat] TLR retrieval failed:", err);
    }
  }

  // 4. OpenData fallback
  if (!usedRetrieval && isWithinServiceHours().withinHours) {
    try {
      const odResult = await fetchFromOpenData(userText, { timeoutMs: 5000 });
      if (odResult.success && odResult.html) {
        const cleaned = odResult.html.replace(/<[^>]+>/g, "").slice(0, 600);
        if (cleaned.length > 100) {
          legalContext = cleaned;
          usedRetrieval = true;
          sourceProvider = "opendata";
        }
      }
    } catch (err) {
      console.warn("[AgentChat] OpenData fallback failed:", err);
    }
  }

  if (!usedRetrieval) {
    sourceProvider = "none";
  }

  // 5. Build prompt
  const maxHistory = getMaxHistoryTurns();
  const historySlice = (req.history ?? []).slice(-maxHistory * 2);

  const historyBlock = historySlice
    .map((m) => `${m.role === "user" ? "使用者" : "助理"}：${m.content}`)
    .join("\n");

  const systemPrompt = [
    "你是台灣法律輔助助理「法律小幫手」。",
    "你的職責是根據使用者提供的事實，結合已檢索到的法規與裁判資料，",
    "以繁體中文回覆簡潔、準確的法律分析與建議。",
    "",
    "規則：",
    "- 回覆長度控制在 500 字以內，除非使用者要求詳細說明。",
    "- 引用法條時必須附上完整條號，不得虛構。",
    "- 保持中立客觀，不做立場判斷。",
    "- 末尾必須附上免責聲明。",
    triage.isSensitive
      ? "- 本案件涉及敏感類型（性別/家事），請特別注意保護當事人隱私。"
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    systemPrompt,
    "",
    historyBlock ? `--- 對話紀錄 ---\n${historyBlock}\n---` : "",
    "",
    legalContext
      ? `--- 相關法律資料 ---\n${legalContext}\n---`
      : "",
    "",
    `使用者：${userText}`,
    "",
    "助理：",
  ].join("\n");

  // 6. Generate via LLM
  let llmText: string;
  try {
    const aiPromise = defaultAIProvider.generate(prompt, { temperature: 0.3 });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AGENT_CHAT_TIMEOUT")), 8000)
    );
    const response = await Promise.race([aiPromise, timeoutPromise]);
    llmText = response.text;
  } catch (err) {
    console.error("[AgentChat] LLM generation failed:", err);
    return {
      success: false,
      error: "AI 回應逾時或發生錯誤，請稍後再試。",
    };
  }

  // 7. Citation Gate
  const verification = verifyLegalCitations(llmText);
  let gateStatus: "PASS" | "NEEDS_REVIEW" | "FAIL" = "NEEDS_REVIEW";

  if (verification.ghostCount > 0) {
    gateStatus = "FAIL";
    return {
      success: true,
      reply:
        "系統偵測到回覆中可能存在未經驗證的法條引用，為確保資訊準確性，已暫停顯示回覆。請稍後再試或重新提問。",
      disclaimer: getDisclaimer(sourceProvider),
      usedRetrieval,
      sourceProvider,
      gateStatus: "FAIL",
    };
  }

  if (verification.totalChecked === 0) {
    gateStatus = "NEEDS_REVIEW";
  } else {
    gateStatus = "PASS";
  }

  // 8. PII redaction
  const sanitizedReply = scrubPersonalInfo(verification.sanitizedText);

  // 9. Append disclaimer
  const reply = `${sanitizedReply}\n\n---\n${getDisclaimer(sourceProvider)}`;

  return {
    success: true,
    reply,
    disclaimer: getDisclaimer(sourceProvider),
    usedRetrieval,
    sourceProvider,
    gateStatus,
  };
}
