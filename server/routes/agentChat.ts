import { Router, Request, Response } from "express";
import { handleAgentChat } from "../services/agentChat.js";

const router = Router();

/**
 * POST /api/agent-chat
 * Stateless conversational legal assistant.
 *
 * Body: { userInput: string, history?: Array<{role,content,timestamp}> }
 * Returns: { success, reply, disclaimer, usedRetrieval, sourceProvider, gateStatus }
 */
router.post("/api/agent-chat", async (req: Request, res: Response) => {
  try {
    const { userInput, history } = req.body as {
      userInput?: string;
      history?: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>;
    };

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: "請輸入您的問題。" });
    }

    const result = await handleAgentChat({
      userInput: userInput.trim(),
      history: history ?? [],
    });

    if (!result.success) {
      return res.status(503).json({ error: result.error });
    }

    return res.json({
      success: true,
      reply: result.reply,
      disclaimer: result.disclaimer,
      usedRetrieval: result.usedRetrieval,
      sourceProvider: result.sourceProvider,
      gateStatus: result.gateStatus,
    });
  } catch (error: any) {
    console.error("[AgentChatRoute] Error:", error);
    return res.status(500).json({
      error: "Agent Chat 處理失敗",
      details: error.message,
    });
  }
});

export default router;
