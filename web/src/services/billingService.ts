// ============================================================
// Billing Service — Shopify Recurring Application Charges
// ============================================================

import { LATEST_API_VERSION } from "@shopify/shopify-api";
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

// ── Helper: fetch subscription status from Shopify ──────────────────────────
async function fetchShopifySubscriptionStatus(
  shopDomain: string,
  accessToken: string,
  subscriptionId: string
): Promise<{ status: string; name: string } | null> {
  const query = `
    query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          name
          status
          currentPeriodEnd
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables: { id: subscriptionId } }),
      }
    );

    if (!response.ok) return null;

    const json: any = await response.json();
    const node = json?.data?.node;
    if (!node) return null;

    return { status: node.status as string, name: node.name as string };
  } catch (err) {
    console.error("[Billing] fetchShopifySubscriptionStatus error:", err);
    return null;
  }
}

// ── Helper: fetch active subscriptions from Shopify ─────────────────────────
export async function fetchActiveShopifySubscriptions(
  shopDomain: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  const query = `
    {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) return [];

    const json: any = await response.json();
    return json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
  } catch (err) {
    console.error("[Billing] fetchActiveShopifySubscriptions error:", err);
    return [];
  }
}

// ── createShopifySubscription ────────────────────────────────────────────────
// BUG FIX (Bug A): We ONLY store the new plan in `pendingPlan`.
// The current `plan` field is NOT changed until the merchant accepts the charge
// and `confirmSubscription` verifies it with Shopify.
export async function createShopifySubscription(
  shopDomain: string,
  plan: Plan,
  returnUrl: string,
  activeToken?: string
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
  const accessToken = activeToken ?? shop.accessToken;

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
      `https://${shopDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`,
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
    throw new Error(`Shopify GraphQL Error: ${topLevelErrorMsg || mutationErrors}`);
  }

  if (!result?.confirmationUrl || !result?.appSubscription?.id) {
    throw new Error("Unable to create subscription. Missing confirmation URL.");
  }

  // ── KEY FIX: Store the subscription as PENDING but do NOT change the
  // current `plan`. We save the intended plan in `pendingPlan` only.
  // The `plan` field will be updated to the new value only after Shopify
  // confirms the charge is ACTIVE in confirmSubscription().
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {
      pendingPlan: plan,
      status: "PENDING",
      shopifySubscriptionId: result.appSubscription.id,
      shopifyConfirmationUrl: result.confirmationUrl,
    },
    create: {
      shopId: shop.id,
      plan: "FREE",           // Keep FREE as base until confirmed
      pendingPlan: plan,
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

// ── confirmSubscription ──────────────────────────────────────────────────────
// BUG FIX (Bug A): Verify with Shopify API that the charge is actually ACTIVE
// before updating the DB plan. This prevents a merchant declining/ignoring the
// charge from having their plan changed.
export async function confirmSubscription(
  shopDomain: string,
  chargeId: string
): Promise<{ success: boolean; status: string }> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop || !shop.subscription) {
    return { success: false, status: "NOT_FOUND" };
  }

  // Verify with Shopify that this charge is actually ACTIVE
  const shopifyStatus = await fetchShopifySubscriptionStatus(
    shopDomain,
    shop.accessToken,
    chargeId
  );

  if (!shopifyStatus) {
    console.error(`[Billing] Could not verify subscription ${chargeId} with Shopify for ${shopDomain}`);
    // Cannot confirm without Shopify's response — leave current state unchanged
    return { success: false, status: "VERIFICATION_FAILED" };
  }

  const status = shopifyStatus.status.toUpperCase();
  console.log(`[Billing] Shopify confirmed subscription ${chargeId} status: ${status} for ${shopDomain}`);

  if (status === "ACTIVE") {
    // Only now promote pendingPlan → plan
    const planToActivate = (shop.subscription.pendingPlan ?? shop.subscription.plan) as Plan;

    await prisma.subscription.update({
      where: { shopId: shop.id },
      data: {
        plan: planToActivate,
        pendingPlan: null,          // Clear pending plan
        status: "ACTIVE",
        shopifySubscriptionId: chargeId,
        shopifyConfirmationUrl: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelledAt: null,
      },
    });

    // Sync active sections count after plan activation
    await syncActiveSections(shop.id);
    return { success: true, status: "ACTIVE" };

  } else if (status === "DECLINED") {
    // Merchant declined — reset to previous plan, clear pending
    await prisma.subscription.update({
      where: { shopId: shop.id },
      data: {
        pendingPlan: null,
        status: "DECLINED",
        shopifySubscriptionId: null,
        shopifyConfirmationUrl: null,
      },
    });
    return { success: false, status: "DECLINED" };

  } else {
    // Pending, frozen, etc. — don't change anything yet
    console.log(`[Billing] Subscription ${chargeId} is in status ${status}, not activating.`);
    return { success: false, status };
  }
}

// ── cancelShopifySubscription ────────────────────────────────────────────────
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
      pendingPlan: null,
      status: "CANCELLED",
      shopifySubscriptionId: null,
      shopifyConfirmationUrl: null,
      cancelledAt: new Date(),
    },
  });

  if (lockedCount > 0) {
    console.log(
      `[Billing] ${lockedCount} sections locked due to downgrade from ${previousPlan} to FREE for ${shopDomain}`
    );
  }
}

// ── handleSubscriptionWebhook ────────────────────────────────────────────────
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
        pendingPlan: null,
        cancelledAt: new Date(),
      },
    });
    await handlePlanDowngrade(shop.id, "FREE");
  } else if (status === "ACTIVE") {
    const sub = shop.subscription;
    const planToActivate = (sub?.pendingPlan ?? sub?.plan ?? "FREE") as Plan;

    await prisma.subscription.updateMany({
      where: {
        shopId: shop.id,
        shopifySubscriptionId: payload.id,
      },
      data: {
        plan: planToActivate,
        pendingPlan: null,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
