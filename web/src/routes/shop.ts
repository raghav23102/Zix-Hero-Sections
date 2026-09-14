// ============================================================
// Route — Shop (dashboard data)
// ============================================================

import { Router } from "express";
import { requireShop } from "../middleware/requireShop.js";
import { getUsageData } from "../services/usageService.js";
import { prisma } from "../db.js";

export const shopRouter = Router();
shopRouter.use(requireShop);

// GET /api/shop/dashboard — all data needed for dashboard
shopRouter.get("/dashboard", async (req, res) => {
  const shop = res.locals["shop"];

  const [usage, recentSections, totalSections, activeSections] =
    await Promise.all([
      getUsageData(shop.shopDomain),
      prisma.heroSection.findMany({
        where: { shopId: shop.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.heroSection.count({ where: { shopId: shop.id } }),
      prisma.heroSection.count({
        where: { shopId: shop.id, status: "ACTIVE" },
      }),
    ]);

  res.json({
    success: true,
    data: {
      shop: {
        shopDomain: shop.shopDomain,
        email: shop.email,
        name: shop.name,
      },
      usage,
      stats: {
        totalSections,
        activeSections,
        availableTemplates: usage?.templateLimit ?? 2,
        currentPlan: usage?.plan ?? "FREE",
      },
      recentSections,
    },
  });
});

// PUT /api/shop/info — update shop info (Shopify webhooks can update this)
shopRouter.put("/info", async (req, res) => {
  const shop = res.locals["shop"];
  const { name, email, currency, timezone } = req.body as {
    name?: string;
    email?: string;
    currency?: string;
    timezone?: string;
  };

  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(currency && { currency }),
      ...(timezone && { timezone }),
    },
  });

  res.json({ success: true, data: updated });
});
