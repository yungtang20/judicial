import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { createSignedToken } from "../middleware/auth.js";

const router = Router();

// Anonymous browser sessions receive a short-lived, isolated client token.
router.post("/api/auth/guest", (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_GUEST_MODE !== "true") {
    return res.status(403).json({ error: "GUEST_MODE_DISABLED_IN_PRODUCTION" });
  }
  const sessionId = `guest_${crypto.randomUUID()}`;
  const token = createSignedToken({
    sub: sessionId,
    tenantId: sessionId,
    role: "client",
    name: "Guest User"
  }, undefined, 60 * 60 * 4);
  res.json({ token, expiresIn: 60 * 60 * 4 });
});

export default router;
