// ============================================================
// Route — Auth (shop info after OAuth)
// ============================================================

import { Router } from "express";
import { requireShop } from "../middleware/requireShop.js";
import { getUsageData } from "../services/usageService.js";

export const authRouter = Router();

authRouter.get("/auth/session", requireShop, async (req, res) => {
  const shop = res.locals["shop"];
  const usage = await getUsageData(shop.shopDomain);

  res.json({
    success: true,
    data: {
      shopDomain: shop.shopDomain,
      email: shop.email,
      name: shop.name,
      plan: shop.subscription?.plan ?? "FREE",
      usage,
    },
  });
});
