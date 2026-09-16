import { Request, Response, NextFunction } from "express";
import { shopify } from "../index.js";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = await shopify.session.getCurrentId({
      isOnline: shopify.config.useOnlineTokens,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      console.warn("[RequireAuth] No session ID found in request.");
      return res.status(403).json({ error: "No session found" });
    }

    const session = await shopify.config.sessionStorage.loadSession(sessionId);
    
    if (!session || !session.accessToken) {
      console.warn(`[RequireAuth] Session not found or missing access token for ID: ${sessionId}`);
      return res.status(403).json({ error: "Session missing or token expired" });
    }

    res.locals.shopify = { session };
    next();
  } catch (error) {
    console.error("[RequireAuth] Error validating session:", error);
    res.status(500).json({ error: "Internal session error" });
  }
};
