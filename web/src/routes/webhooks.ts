// ============================================================
// Route — Webhooks (Shopify lifecycle events)
// ============================================================

import { Router } from "express";
import crypto from "crypto";
import { uninstallShop } from "../services/shopService.js";
import { handleSubscriptionWebhook } from "../services/billingService.js";

export const webhooksRouter = Router();

// Shopify webhook signature verification
function verifyWebhook(body: Buffer, hmacHeader: string): boolean {
  const secret = process.env["SHOPIFY_API_SECRET"] ?? "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "base64"),
    Buffer.from(hmacHeader, "base64")
  );
}

// Middleware to verify Shopify webhook signatures
function verifyShopifyWebhook(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
): void {
  const hmac = req.headers["x-shopify-hmac-sha256"] as string;
  const rawBody = req.body as Buffer;

  if (!hmac || !rawBody) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (!verifyWebhook(rawBody, hmac)) {
    res.status(401).send("Unauthorized");
    return;
  }

  next();
}

// POST /api/webhooks/app-uninstalled
webhooksRouter.post(
  "/app-uninstalled",
  async (req, res) => {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;

    if (!shopDomain) {
      res.status(400).send("Bad Request");
      return;
    }

    try {
      await uninstallShop(shopDomain);
      console.log(`[Webhook] App uninstalled: ${shopDomain}`);
      res.status(200).send("OK");
    } catch (err) {
      console.error("[Webhook] Uninstall error:", err);
      res.status(500).send("Error");
    }
  }
);

// POST /api/webhooks/subscription-update
webhooksRouter.post("/subscription-update", async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;

  if (!shopDomain) {
    res.status(400).send("Bad Request");
    return;
  }

  try {
    const payload = req.body as {
      id: string;
      status: string;
      name: string;
    };
    await handleSubscriptionWebhook(shopDomain, payload);
    console.log(`[Webhook] Subscription update for: ${shopDomain}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("[Webhook] Subscription update error:", err);
    res.status(500).send("Error");
  }
});

// POST /api/webhooks/shop-update
webhooksRouter.post("/shop-update", async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;

  if (!shopDomain) {
    res.status(400).send("Bad Request");
    return;
  }

  try {
    const payload = req.body as {
      name?: string;
      email?: string;
      currency?: string;
      iana_timezone?: string;
    };

    const { prisma } = await import("../db.js");
    await prisma.shop.updateMany({
      where: { shopDomain },
      data: {
        ...(payload.name && { name: payload.name }),
        ...(payload.email && { email: payload.email }),
        ...(payload.currency && { currency: payload.currency }),
        ...(payload.iana_timezone && { timezone: payload.iana_timezone }),
      },
    });

    res.status(200).send("OK");
  } catch (err) {
    console.error("[Webhook] Shop update error:", err);
    res.status(500).send("Error");
  }
});

// ============================================================
// SHOPIFY MANDATORY COMPLIANCE WEBHOOKS (GDPR / PRIVACY)
// Required for Shopify App Store Submission
// ============================================================

// POST /api/webhooks/customers-data-request
webhooksRouter.post("/customers-data-request", async (req, res) => {
  console.log("[Webhook GDPR] Customers data request received:", req.body);
  // Zix Hero Sections does not store individual customer personal data
  res.status(200).send("OK");
});

// POST /api/webhooks/customers-redact
webhooksRouter.post("/customers-redact", async (req, res) => {
  console.log("[Webhook GDPR] Customers redact received:", req.body);
  // Zix Hero Sections does not store individual customer personal data
  res.status(200).send("OK");
});

// POST /api/webhooks/shop-redact
webhooksRouter.post("/shop-redact", async (req, res) => {
  const shopDomain = (req.body as { shop_domain?: string })?.shop_domain;
  console.log("[Webhook GDPR] Shop redact received for:", shopDomain);

  if (shopDomain) {
    try {
      const { uninstallShop } = await import("../services/shopService.js");
      await uninstallShop(shopDomain);
    } catch (err) {
      console.error("[Webhook GDPR] Shop redact error:", err);
    }
  }

  res.status(200).send("OK");
});
