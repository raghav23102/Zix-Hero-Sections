// ============================================================
// Route — Templates
// ============================================================

import { Router } from "express";
import { requireShop } from "../middleware/requireShop.js";
import {
  TEMPLATES,
  getAccessibleTemplates,
} from "../shared/templates.js";
import { Plan, TemplateDefinition } from "../shared/types.js";

export const templatesRouter = Router();
templatesRouter.use(requireShop);

// GET /api/templates — list all templates with access info
templatesRouter.get("/", (req, res) => {
  const shop = res.locals["shop"];
  const plan: Plan = shop.subscription?.plan ?? "FREE";

  const accessible = getAccessibleTemplates(plan);
  const accessibleIds = new Set(accessible.map((t: TemplateDefinition) => t.id));

  const templates = TEMPLATES.map((t: TemplateDefinition) => ({
    ...t,
    isAccessible: accessibleIds.has(t.id),
  }));

  res.json({ success: true, data: templates, plan });
});

// GET /api/templates/:id — get single template
templatesRouter.get("/:id", (req, res) => {
  const shop = res.locals["shop"];
  const plan: Plan = shop.subscription?.plan ?? "FREE";
  const accessible = getAccessibleTemplates(plan);

  const template = TEMPLATES.find((t: TemplateDefinition) => t.id === req.params["id"]);
  if (!template) {
    res.status(404).json({ success: false, error: "Template not found." });
    return;
  }

  const isAccessible = accessible.some((t: TemplateDefinition) => t.id === template.id);

  res.json({
    success: true,
    data: { ...template, isAccessible },
  });
});
