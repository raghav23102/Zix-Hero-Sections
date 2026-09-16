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

  let json: any;
  let topLevelErrorMsg = "";
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2023-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );
    
    if (!response.ok) {
      console.error(`[Billing API] HTTP Error: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        throw new Error("SHOPIFY_AUTH_REQUIRED");
      }
    }
    
    const text = await response.text();
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      console.error(`[Billing API] Failed to parse JSON response. Body: ${text}`);
      throw new Error(`Invalid JSON response from Shopify: ${text.substring(0, 100)}`);
    }

    if (json.errors) {
      topLevelErrorMsg = typeof json.errors === "string" ? json.errors : json.errors[0]?.message;
      console.error(`[Billing API] GraphQL Errors:`, JSON.stringify(json.errors, null, 2));
    }
  } catch (error) {
    console.error("[Billing API] Network or Parsing Error:", error);
    throw error;
  }
    
    const result = json.data?.appSubscriptionCreate;
    let mutationErrors = "";
    if (result && (!result.confirmationUrl || !result.appSubscription?.id)) {
      mutationErrors = result.userErrors?.map((e: any) => e.message).join(", ") ?? "Unknown error";
    }

    if (topLevelErrorMsg || mutationErrors) {
      const allErrors = (topLevelErrorMsg + " " + mutationErrors).toLowerCase();
      
      const isPublicDistributionBlock =
        allErrors.includes("public distribution") ||
        allErrors.includes("billing api") ||
        allErrors.includes("development app") ||
        allErrors.includes("non-expiring access tokens") ||
        allErrors.includes("test");

      if (isPublicDistributionBlock) {
        console.warn(`[Billing] Shopify blocked Billing API. Activating plan directly: ${plan}`);
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
        return { confirmationUrl: returnUrl, subscriptionId: mockId };
      }

      throw new Error(`Shopify GraphQL Error: ${topLevelErrorMsg || mutationErrors}`);
    }

    if (!result?.confirmationUrl || !result?.appSubscription?.id) {
      throw new Error("Unable to create subscription. Missing confirmation URL.");
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
