// ============================================================
// Route — Settings
// ============================================================

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireShop } from "../middleware/requireShop.js";

export const settingsRouter = Router();
settingsRouter.use(requireShop);

const updateSettingsSchema = z.object({
  defaultHeadingFont: z.string().optional(),
  defaultButtonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  defaultButtonTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  defaultSectionHeight: z.string().optional(),
  enableAnimations: z.boolean().optional(),
  notifyOnPublish: z.boolean().optional(),
});

// GET /api/settings
settingsRouter.get("/", async (req, res) => {
  const shop = res.locals["shop"];

  const settings = await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: { shopId: shop.id },
  });

  res.json({ success: true, data: settings });
});

// PUT /api/settings
settingsRouter.put("/", async (req, res) => {
  const shop = res.locals["shop"];

  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid settings data." });
    return;
  }

  const settings = await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: parsed.data,
    create: { shopId: shop.id, ...parsed.data },
  });

  res.json({ success: true, data: settings });
});
