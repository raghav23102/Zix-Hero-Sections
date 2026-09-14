// ============================================================
// Middleware — Require Shop (ensure shop exists in DB)
// ============================================================

import { Request, Response, NextFunction } from "express";
import { getShopByDomain } from "../services/shopService.js";

export async function requireShop(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const shopDomain: string =
    res.locals["shopify"]?.session?.shop ?? req.query["shop"] as string ?? "";

  if (!shopDomain) {
    res.status(401).json({ success: false, error: "Shop domain required." });
    return;
  }

  const shop = await getShopByDomain(shopDomain);

  if (!shop) {
    res.status(404).json({
      success: false,
      error: "Shop not found. Please reinstall the app.",
    });
    return;
  }

  if (!shop.isActive) {
    res.status(403).json({
      success: false,
      error: "Shop is not active. Please reinstall the app.",
    });
    return;
  }

  // Attach shop to request for downstream handlers
  res.locals["shop"] = shop;
  next();
}
