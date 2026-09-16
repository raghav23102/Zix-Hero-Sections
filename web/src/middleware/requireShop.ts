// ============================================================
// Middleware — Require Shop (ensure shop exists in DB)
// ============================================================

import { Request, Response, NextFunction } from "express";
import { getShopByDomain } from "../services/shopService.js";
import { prisma } from "../db.js";

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

  const sessionToken = res.locals["shopify"]?.session?.accessToken;

  if (!shop.isActive || (sessionToken && shop.accessToken !== sessionToken)) {
    // If they reached here, they have a valid session (via requireAuth).
    // This happens if Shopify didn't clear the session during uninstallation,
    // so we automatically re-activate the shop and sync the token.
    await prisma.shop.update({
      where: { id: shop.id },
      data: { 
        isActive: true,
        ...(sessionToken ? { accessToken: sessionToken } : {})
      },
    });
    shop.isActive = true;
    if (sessionToken) shop.accessToken = sessionToken;
    console.log(`[requireShop] Auto-reactivated/synced shop ${shopDomain}`);
  }

  // Attach shop to request for downstream handlers
  res.locals["shop"] = shop;
  next();
}
