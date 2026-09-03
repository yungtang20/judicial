import { Router, Request, Response } from "express";

const router = Router();

// In-memory feedback store (replace with database in production)
interface FeedbackEntry {
  triageId: string;
  rating: number;
  comment?: string;
  category?: string;
  timestamp: string;
}

const feedbackStore: FeedbackEntry[] = [];

router.post("/api/feedback", async (req: Request, res: Response) => {
  try {
    const { triageId, rating, comment, category } = req.body;

    // Validate required fields
    if (!triageId || typeof triageId !== "string") {
      return res.status(400).json({ error: "請提供 triageId" });
    }

    if (rating === undefined || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "評分必須是 1-5 之間的數字" });
    }

    // Store feedback
    const entry: FeedbackEntry = {
      triageId,
      rating,
      comment: typeof comment === "string" ? comment : undefined,
      category: typeof category === "string" ? category : undefined,
      timestamp: new Date().toISOString()
    };

    feedbackStore.push(entry);

    // Keep only last 1000 entries in memory
    if (feedbackStore.length > 1000) {
      feedbackStore.splice(0, feedbackStore.length - 1000);
    }

    console.log(`[Feedback] 收到回饋: triageId=${triageId}, rating=${rating}`);

    res.json({ success: true, message: "感謝您的回饋" });
  } catch (err: any) {
    console.error("[Feedback] Error:", err.message);
    res.status(500).json({ error: "回饋儲存失敗" });
  }
});

// Optional: GET endpoint to retrieve feedback summary
router.get("/api/feedback/summary", async (req: Request, res: Response) => {
  try {
    const avgRating = feedbackStore.length > 0
      ? feedbackStore.reduce((sum, f) => sum + f.rating, 0) / feedbackStore.length
      : 0;

    res.json({
      totalFeedback: feedbackStore.length,
      averageRating: Math.round(avgRating * 100) / 100
    });
  } catch (err: any) {
    console.error("[Feedback] Summary error:", err.message);
    res.status(500).json({ error: "回饋摘要取得失敗" });
  }
});

export default router;
