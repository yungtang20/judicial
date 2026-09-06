import { Router, Request, Response } from "express";
import { handleAgentChat } from "../services/agentChat.js";

const router = Router();

const MAX_USER_INPUT_LENGTH = 20000;
const MAX_HISTORY_COUNT = 30;
const MAX_CONTENT_LENGTH = 10000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * 嚴格檢驗 Agent Chat 請求參數
 */
function validateAgentChatInput(body: unknown): { valid: boolean; error?: string; data?: { userInput: string; history: ChatMessage[] } } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "請求內容必須為 JSON 物件" };
  }

  const { userInput, history } = body as Record<string, unknown>;

  if (typeof userInput !== "string" || !userInput.trim()) {
    return { valid: false, error: "請輸入您的問題。" };
  }

  const trimmedInput = userInput.trim();
  if (trimmedInput.length > MAX_USER_INPUT_LENGTH) {
    return { valid: false, error: `輸入問題字數超過上限（最多 ${MAX_USER_INPUT_LENGTH} 字元）` };
  }

  let validatedHistory: ChatMessage[] = [];

  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      return { valid: false, error: "歷史訊息 (history) 必須為陣列" };
    }

    if (history.length > MAX_HISTORY_COUNT) {
      return { valid: false, error: `對話歷史紀錄筆數超過上限（最多 ${MAX_HISTORY_COUNT} 筆）` };
    }

    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      if (!item || typeof item !== "object") {
        return { valid: false, error: `對話歷史第 ${i + 1} 筆格式錯誤` };
      }

      const { role, content, timestamp } = item as Record<string, unknown>;

      if (role !== "user" && role !== "assistant") {
        return { valid: false, error: `對話歷史第 ${i + 1} 筆之 role 僅允許 'user' 或 'assistant'` };
      }

      if (typeof content !== "string") {
        return { valid: false, error: `對話歷史第 ${i + 1} 筆之內容必須為字串` };
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        return { valid: false, error: `對話歷史第 ${i + 1} 筆字數超過上限（最多 ${MAX_CONTENT_LENGTH} 字元）` };
      }

      validatedHistory.push({
        role,
        content,
        timestamp: typeof timestamp === "string" ? timestamp.slice(0, 50) : new Date().toISOString(),
      });
    }
  }

  return {
    valid: true,
    data: {
      userInput: trimmedInput,
      history: validatedHistory,
    },
  };
}

/**
 * POST /api/agent-chat
 * Body: { userInput: string, history?: Array<{role, content, timestamp}> }
 */
router.post("/api/agent-chat", async (req: Request, res: Response) => {
  const requestId = req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

  try {
    const validation = validateAgentChatInput(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        error: validation.error,
        message: validation.error,
        requestId,
      });
    }

    const { userInput, history } = validation.data;

    const result = await handleAgentChat({
      userInput,
      history,
    });

    if (!result.success) {
      return res.status(503).json({
        code: "SERVICE_UNAVAILABLE",
        error: result.error,
        message: result.error,
        requestId,
      });
    }

    return res.json({
      success: true,
      reply: result.reply,
      disclaimer: result.disclaimer,
      usedRetrieval: result.usedRetrieval,
      sourceProvider: result.sourceProvider,
      gateStatus: result.gateStatus,
      requestId,
    });
  } catch (error: any) {
    console.error(`[AgentChatRoute] [${requestId}] Error:`, error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      error: "Agent Chat 處理失敗",
      message: "Agent Chat 處理失敗，請稍後再試",
      requestId,
    });
  }
});

export default router;
