// ============================================================
// Route — Hero Sections (CRUD)
// ============================================================

import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireShop } from "../middleware/requireShop.js";
import { canCreateSection, syncActiveSections } from "../services/usageService.js";
import { isTemplateAccessible } from "../shared/templates.js";
import { SectionStatus } from "../shared/types.js";

export const sectionsRouter = Router();
sectionsRouter.use(requireShop);

// Zod schema for hero section config
const heroConfigSchema = z.record(z.unknown());

const createSectionSchema = z.object({
  name: z.string().min(1).max(100),
  templateId: z.string().min(1),
  configuration: heroConfigSchema.optional().default({}),
});

const updateSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  configuration: heroConfigSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  isPublished: z.boolean().optional(),
});

// GET /api/sections — list all sections for the shop
sectionsRouter.get("/", async (req, res) => {
  const shop = res.locals["shop"];
  const page = parseInt(req.query["page"] as string ?? "1", 10);
  const pageSize = parseInt(req.query["pageSize"] as string ?? "20", 10);
  const status = req.query["status"] as string | undefined;

  const where: Record<string, unknown> = { shopId: shop.id };
  if (status) where["status"] = status;

  const [sections, total] = await Promise.all([
    prisma.heroSection.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.heroSection.count({ where }),
  ]);

  res.json({
    success: true,
    data: sections,
    total,
    page,
    pageSize,
  });
});

// GET /api/sections/:id — get a single section
sectionsRouter.get("/:id", async (req, res) => {
  const shop = res.locals["shop"];
  const section = await prisma.heroSection.findFirst({
    where: { id: req.params["id"], shopId: shop.id },
  });

  if (!section) {
    res.status(404).json({ success: false, error: "Hero section not found." });
    return;
  }

  res.json({ success: true, data: section });
});

// POST /api/sections — create a new section
sectionsRouter.post("/", async (req, res) => {
  const shop = res.locals["shop"];
  const plan = shop.subscription?.plan ?? "FREE";

  // Check section limit
  const canCreate = await canCreateSection(shop.shopDomain);
  if (!canCreate) {
    res.status(403).json({
      success: false,
      error:
        "You've reached your plan limit. Upgrade your plan to create more Hero Sections.",
      code: "PLAN_LIMIT_REACHED",
    });
    return;
  }

  const parsed = createSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid section data. Please check your inputs.",
    });
    return;
  }

  const { name, templateId, configuration } = parsed.data;

  // Check template access
  if (!isTemplateAccessible(templateId, plan)) {
    res.status(403).json({
      success: false,
      error: "Upgrade your plan to unlock this Hero Section template.",
      code: "TEMPLATE_LOCKED",
    });
    return;
  }

  const section = await prisma.heroSection.create({
    data: {
      shopId: shop.id,
      name,
      templateId,
      configuration: (configuration ?? {}) as Prisma.InputJsonObject,
      status: "ACTIVE",
      isPublished: false,
    },
  });

  await syncActiveSections(shop.id);

  res.status(201).json({ success: true, data: section });
});

// PUT /api/sections/:id — update a section
sectionsRouter.put("/:id", async (req, res) => {
  const shop = res.locals["shop"];

  const existing = await prisma.heroSection.findFirst({
    where: { id: req.params["id"], shopId: shop.id },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: "Hero section not found." });
    return;
  }

  // Prevent editing locked sections without explanation
  if (existing.status === "LOCKED") {
    res.status(403).json({
      success: false,
      error:
        "This section is locked due to a plan downgrade. Upgrade your plan to reactivate it.",
      code: "SECTION_LOCKED",
    });
    return;
  }

  const parsed = updateSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid section data." });
    return;
  }

  const updated = await prisma.heroSection.update({
    where: { id: req.params["id"] },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.configuration && {
        configuration: parsed.data.configuration as Prisma.InputJsonObject,
      }),
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(typeof parsed.data.isPublished === "boolean" && {
        isPublished: parsed.data.isPublished,
      }),
    },
  });

  await syncActiveSections(shop.id);
  res.json({ success: true, data: updated });
});

// POST /api/sections/:id/duplicate — duplicate a section
sectionsRouter.post("/:id/duplicate", async (req, res) => {
  const shop = res.locals["shop"];
  const plan = shop.subscription?.plan ?? "FREE";

  const canCreate = await canCreateSection(shop.shopDomain);
  if (!canCreate) {
    res.status(403).json({
      success: false,
      error: "You've reached your plan limit.",
      code: "PLAN_LIMIT_REACHED",
    });
    return;
  }

  const original = await prisma.heroSection.findFirst({
    where: { id: req.params["id"], shopId: shop.id },
  });

  if (!original) {
    res.status(404).json({ success: false, error: "Hero section not found." });
    return;
  }

  const duplicate = await prisma.heroSection.create({
    data: {
      shopId: shop.id,
      name: `${original.name} (Copy)`,
      templateId: original.templateId,
      configuration: (original.configuration ?? {}) as Prisma.InputJsonObject,
      status: "INACTIVE",
      isPublished: false,
    },
  });

  await syncActiveSections(shop.id);
  res.status(201).json({ success: true, data: duplicate });
});

// DELETE /api/sections/:id — delete a section
sectionsRouter.delete("/:id", async (req, res) => {
  const shop = res.locals["shop"];

  const existing = await prisma.heroSection.findFirst({
    where: { id: req.params["id"], shopId: shop.id },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: "Hero section not found." });
    return;
  }

  await prisma.heroSection.delete({ where: { id: req.params["id"] } });
  await syncActiveSections(shop.id);

  res.json({ success: true, message: "Hero section deleted successfully." });
});
