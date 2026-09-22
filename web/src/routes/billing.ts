// ============================================================
// Route — Billing
// ============================================================

import { Router } from "express";
import { z } from "zod";
import { requireShop } from "../middleware/requireShop.js";
import {
  createShopifySubscription,
  cancelShopifySubscription,
  confirmSubscription,
  syncSubscriptionWithShopify,
} from "../services/billingService.js";
import { Plan, PLAN_LIMITS, PLAN_PRICES } from "../shared/types.js";
import { prisma } from "../db.js";

export const billingRouter = Router();
billingRouter.use(requireShop);

// GET /api/billing — sync with Shopify, return current plan + pricing info
billingRouter.get("/", async (req, res) => {
  const shop = res.locals["shop"];
  const accessToken: string =
    res.locals.shopify?.session?.accessToken ?? shop.accessToken ?? "";

  // Sync with Shopify to get the true current plan.
  // This ensures no stale state — Shopify is the source of truth.
  let currentPlan: Plan = "FREE";
  try {
    currentPlan = await syncSubscriptionWithShopify(shop.shopDomain, accessToken);
  } catch (err) {
    console.error("[Billing] Sync failed, using DB fallback:", err);
    currentPlan = (shop.subscription?.plan as Plan) ?? "FREE";
  }

  // Re-read the subscription from DB after sync
  const updatedSub = await prisma.subscription.findUnique({
    where: { shopId: shop.id },
  });

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
      subscription: updatedSub
        ? {
            plan: updatedSub.plan,
            status: updatedSub.status,
            currentPeriodEnd: updatedSub.currentPeriodEnd ?? null,
          }
        : null,
      plans,
    },
  });
});

// POST /api/billing/subscribe — create a Shopify billing charge
const subscribePlanSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "ULTIMATE"]),
  returnUrl: z.string().url().optional(),
});

billingRouter.post("/subscribe", async (req, res) => {
  const shop = res.locals["shop"];

  const parsed = subscribePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid plan selection." });
    return;
  }

  const { plan, returnUrl } = parsed.data;
  const appUrl = process.env["SHOPIFY_APP_URL"];
  if (!appUrl) {
    res.status(500).json({ success: false, error: "Server misconfiguration." });
    return;
  }

  const confirmUrl = returnUrl ?? `${appUrl}/billing?confirmed=true`;

  try {
    const result = await createShopifySubscription(
      shop.shopDomain,
      plan as Plan,
      confirmUrl,
      res.locals.shopify?.session?.accessToken
    );

    if (!result) {
      res.status(500).json({ success: false, error: "Unable to create subscription." });
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
    if (error.message === "SHOPIFY_AUTH_REQUIRED") {
      res.setHeader(
        "X-Shopify-API-Request-Failure-Reauthorize-Url",
        `/api/auth?shop=${shop.shopDomain}`
      );
      res.status(403).json({ success: false, error: "Authentication expired. Please reload." });
      return;
    }
    res.status(400).json({ success: false, error: error.message ?? "Failed to create subscription." });
  }
});

// POST /api/billing/cancel — downgrade to free (cancels Shopify subscription)
billingRouter.post("/cancel", async (req, res) => {
  const shop = res.locals["shop"];
  await cancelShopifySubscription(
    shop.shopDomain,
    res.locals.shopify?.session?.accessToken
  );
  res.json({ success: true, message: "Subscription cancelled. You are now on the Free plan." });
});

// GET /api/billing/confirm — called after Shopify redirects back with charge_id
billingRouter.get("/confirm", async (req, res) => {
  const shop = res.locals["shop"];
  const chargeId = req.query["charge_id"] as string;

  if (!chargeId) {
    res.status(400).json({ success: false, error: "No charge ID provided." });
    return;
  }

  const accessToken: string =
    res.locals.shopify?.session?.accessToken ?? shop.accessToken ?? "";

  const result = await confirmSubscription(shop.shopDomain, chargeId, accessToken);

  if (result.success) {
    res.json({ success: true, message: "Subscription activated!", plan: result.plan });
  } else {
    res.status(200).json({
      success: false,
      error: "Subscription was not approved. No changes have been made.",
    });
  }
});
