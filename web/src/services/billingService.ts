// ============================================================
// Billing Service — Shopify Recurring Application Charges
// ============================================================

import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { prisma } from "../db.js";
import { Plan, PLAN_PRICES } from "../shared/types.js";
import { handlePlanDowngrade, syncActiveSections } from "./usageService.js";

interface CreateSubscriptionResult {
  confirmationUrl: string;
  subscriptionId: string;
}

const PLAN_NAMES: Record<Plan, string> = {
  FREE: "Zix Hero Sections Free",
  BASIC: "Zix Hero Sections Basic",
  PRO: "Zix Hero Sections Pro",
  ULTIMATE: "Zix Hero Sections Ultimate",
};

export async function createShopifySubscription(
  shopDomain: string,
  plan: Plan,
  returnUrl: string
): Promise<CreateSubscriptionResult | null> {
  if (plan === "FREE") {
    // Cancel existing subscription for downgrade to free
    await cancelShopifySubscription(shopDomain);
    return null;
  }

  const price = PLAN_PRICES[plan as Exclude<Plan, "FREE">];
  if (!price) return null;

  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) throw new Error("Shop not found");

  // Use Shopify GraphQL Admin API to create recurring charge
  const accessToken = shop.accessToken;

  const query = `
    mutation appSubscriptionCreate(
      $name: String!
      $lineItems: [AppSubscriptionLineItemInput!]!
      $returnUrl: URL!
      $test: Boolean
    ) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        test: $test
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          status
        }
      }
    }
  `;

  const variables = {
    name: PLAN_NAMES[plan],
    returnUrl,
    test: true, // Always true for now until app is published
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: price, currencyCode: "USD" },
            interval: "EVERY_30_DAYS",
          },
        },
      },
    ],
  };

  const response = await fetch(
    `https://${shopDomain}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = (await response.json()) as {
    data?: {
      appSubscriptionCreate?: {
        confirmationUrl?: string;
        appSubscription?: { id?: string };
        userErrors?: Array<{ message: string }>;
      };
    };
  };

  const result = json.data?.appSubscriptionCreate;
  if (!result?.confirmationUrl || !result?.appSubscription?.id) {
    const errors = result?.userErrors?.map((e) => e.message).join(", ") ?? "Unknown error";

    // Shopify blocks Billing API for unpublished apps.
    // Fallback: immediately activate the plan in our DB so the app works.
    // Remove this once the app is approved for public distribution.
    const isPublicDistributionBlock =
      errors.toLowerCase().includes("public distribution") ||
      errors.toLowerCase().includes("billing api");

    if (isPublicDistributionBlock) {
      console.warn(`[Billing] Shopify blocked Billing API (app unpublished). Activating plan directly: ${plan}`);
      const mockId = `dev_mock_${Date.now()}`;
      await prisma.subscription.upsert({
        where: { shopId: shop.id },
        update: {
          plan,
          status: "ACTIVE",
          shopifySubscriptionId: mockId,
          shopifyConfirmationUrl: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          shopId: shop.id,
          plan,
          status: "ACTIVE",
          shopifySubscriptionId: mockId,
          shopifyConfirmationUrl: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      // Return the returnUrl directly — no Shopify approval page needed
      return { confirmationUrl: returnUrl, subscriptionId: mockId };
    }

    throw new Error(`Shopify billing error: ${errors}`);
  }

  // Store the pending subscription
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {
      plan,
      status: "PENDING",
      shopifySubscriptionId: result.appSubscription.id,
      shopifyConfirmationUrl: result.confirmationUrl,
    },
    create: {
      shopId: shop.id,
      plan,
      status: "PENDING",
      shopifySubscriptionId: result.appSubscription.id,
      shopifyConfirmationUrl: result.confirmationUrl,
    },
  });

  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription.id,
  };
}

export async function confirmSubscription(
  shopDomain: string,
  chargeId: string
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop || !shop.subscription) return;

  await prisma.subscription.update({
    where: { shopId: shop.id },
    data: {
      status: "ACTIVE",
      shopifySubscriptionId: chargeId,
      shopifyConfirmationUrl: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function cancelShopifySubscription(
  shopDomain: string
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop || !shop.subscription) return;

  const previousPlan = shop.subscription.plan as Plan;
  const newPlan: Plan = "FREE";

  // Handle downgrade — lock excess sections
  const lockedCount = await handlePlanDowngrade(shop.id, newPlan);

  await prisma.subscription.update({
    where: { shopId: shop.id },
    data: {
      plan: newPlan,
      status: "CANCELLED",
      shopifySubscriptionId: null,
      cancelledAt: new Date(),
    },
  });

  if (lockedCount > 0) {
    console.log(
      `[Billing] ${lockedCount} sections locked due to downgrade from ${previousPlan} to FREE for ${shopDomain}`
    );
  }
}

export async function handleSubscriptionWebhook(
  shopDomain: string,
  payload: { status: string; id: string; name: string }
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop) return;

  const status = payload.status?.toUpperCase();

  if (status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED") {
    await prisma.subscription.updateMany({
      where: {
        shopId: shop.id,
        shopifySubscriptionId: payload.id,
      },
      data: {
        status: status as "CANCELLED" | "EXPIRED" | "DECLINED",
        plan: "FREE",
        cancelledAt: new Date(),
      },
    });
    await handlePlanDowngrade(shop.id, "FREE");
  } else if (status === "ACTIVE") {
    await prisma.subscription.updateMany({
      where: {
        shopId: shop.id,
        shopifySubscriptionId: payload.id,
      },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
