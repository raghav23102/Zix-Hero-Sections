// ============================================================
// Route — Billing
// ============================================================

import { Router } from "express";
import { z } from "zod";
import { requireShop } from "../middleware/requireShop.js";
import {
  createShopifySubscription,
  cancelShopifySubscription,
} from "../services/billingService.js";
import { Plan, PLAN_LIMITS, PLAN_PRICES } from "../shared/types.js";

export const billingRouter = Router();
billingRouter.use(requireShop);

// GET /api/billing — current plan and pricing info
billingRouter.get("/", async (req, res) => {
  const shop = res.locals["shop"];
  const currentPlan: Plan = shop.subscription?.plan ?? "FREE";

  const plans = [
    {
      id: "FREE",
      name: "Free",
      price: 0,
      sectionLimit: PLAN_LIMITS.FREE.sections,
      templateLimit: PLAN_LIMITS.FREE.templates,
      features: [
        "2 Hero Sections",
        "2 Templates",
        "Basic customization",
        "Responsive design",
        "Theme Editor support",
      ],
      isCurrent: currentPlan === "FREE",
    },
    {
      id: "BASIC",
      name: "Basic",
      price: PLAN_PRICES.BASIC,
      sectionLimit: PLAN_LIMITS.BASIC.sections,
      templateLimit: PLAN_LIMITS.BASIC.templates,
      features: [
        "5 Hero Sections",
        "5 Templates",
        "Advanced customization",
        "Responsive controls",
        "Product Showcase & Fashion layouts",
      ],
      isCurrent: currentPlan === "BASIC",
    },
    {
      id: "PRO",
      name: "Pro",
      price: PLAN_PRICES.PRO,
      sectionLimit: PLAN_LIMITS.PRO.sections,
      templateLimit: PLAN_LIMITS.PRO.templates,
      features: [
        "9 Hero Sections",
        "9 Templates",
        "Advanced customization",
        "Animations",
        "Video Hero",
        "Countdown Timer",
        "Gradient layouts",
      ],
      isCurrent: currentPlan === "PRO",
    },
    {
      id: "ULTIMATE",
      name: "Ultimate",
      price: PLAN_PRICES.ULTIMATE,
      sectionLimit: PLAN_LIMITS.ULTIMATE.sections,
      templateLimit: PLAN_LIMITS.ULTIMATE.templates,
      features: [
        "14 Hero Sections",
        "All 14 Templates",
        "All customization features",
        "Before & After Slider",
        "Sale Promotion Hero",
        "Premium Editorial",
        "Priority support",
      ],
      isCurrent: currentPlan === "ULTIMATE",
    },
  ];

  res.json({
    success: true,
    data: {
      currentPlan,
      subscription: shop.subscription,
      plans,
    },
  });
});

const subscribePlanSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "ULTIMATE"]),
  returnUrl: z.string().url().optional(),
});

// POST /api/billing/subscribe — create a Shopify billing charge
billingRouter.post("/subscribe", async (req, res) => {
  const shop = res.locals["shop"];

  const parsed = subscribePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("[Billing] Zod validation failed:", parsed.error, "Body:", req.body);
    res.status(400).json({ success: false, error: "Invalid plan selection or missing payload." });
    return;
  }

  const { plan, returnUrl } = parsed.data;
  const appUrl = process.env["SHOPIFY_APP_URL"];
  if (!appUrl) {
    res.status(500).json({ success: false, error: "Server misconfiguration: SHOPIFY_APP_URL is missing." });
    return;
  }
  const confirmUrl = returnUrl ?? `${appUrl}/billing?confirmed=true`;

  try {
    const result = await createShopifySubscription(
      shop.shopDomain,
      plan as Plan,
      confirmUrl
    );

    if (!result) {
      res.status(500).json({
        success: false,
        error: "Unable to create subscription. Please try again.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        confirmationUrl: result.confirmationUrl,
        subscriptionId: result.subscriptionId,
      },
    });
  } catch (error: any) {
    console.error("[Billing Subscribe Error]", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to process subscription with Shopify",
    });
  }
});

// POST /api/billing/cancel — cancel subscription (downgrade to free)
billingRouter.post("/cancel", async (req, res) => {
  const shop = res.locals["shop"];
  await cancelShopifySubscription(shop.shopDomain);

  res.json({
    success: true,
    message: "Subscription cancelled. You've been moved to the Free plan.",
  });
});

// GET /api/billing/confirm — called after Shopify redirects back
billingRouter.get("/confirm", async (req, res) => {
  const shop = res.locals["shop"];
  const chargeId = req.query["charge_id"] as string;

  if (!chargeId) {
    res.status(400).json({ success: false, error: "No charge ID provided." });
    return;
  }

  const { confirmSubscription } = await import(
    "../services/billingService.js"
  );
  await confirmSubscription(shop.shopDomain, chargeId);

  res.json({ success: true, message: "Subscription activated!" });
});
