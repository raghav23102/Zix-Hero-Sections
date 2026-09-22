// ============================================================
// Billing Service — Shopify Recurring Application Charges
// Follows standard Shopify billing strategy:
//   - Shopify is the source of truth for subscription state
//   - On billing page load we sync from Shopify's activeSubscriptions
//   - Plan only activates after merchant approves on Shopify
//   - Downgrade cancels the Shopify subscription via API
// ============================================================

import { LATEST_API_VERSION } from "@shopify/shopify-api";
import { prisma } from "../db.js";
import { Plan, PLAN_PRICES } from "../shared/types.js";
import { handlePlanDowngrade, syncActiveSections } from "./usageService.js";

// Map subscription name → Plan enum (reverse of PLAN_NAMES)
const NAME_TO_PLAN: Record<string, Plan> = {
  "Zix Hero Sections Basic": "BASIC",
  "Zix Hero Sections Pro": "PRO",
  "Zix Hero Sections Ultimate": "ULTIMATE",
};

const PLAN_NAMES: Record<Plan, string> = {
  FREE: "Zix Hero Sections Free",
  BASIC: "Zix Hero Sections Basic",
  PRO: "Zix Hero Sections Pro",
  ULTIMATE: "Zix Hero Sections Ultimate",
};

// ── GraphQL helper ───────────────────────────────────────────────────────────
async function shopifyGraphQL(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<any> {
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
    if (response.status === 401) throw new Error("SHOPIFY_AUTH_REQUIRED");
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await response.json();
  if (json.errors) {
    const msg = typeof json.errors === "string" ? json.errors : json.errors[0]?.message;
    throw new Error(`Shopify GraphQL Error: ${msg}`);
  }
  return json.data;
}

// ── syncSubscriptionWithShopify ──────────────────────────────────────────────
// The core of the billing strategy: query Shopify for what subscriptions are
// actually active, then update our DB to match.
// Called on every billing page load so our DB is never stale.
export async function syncSubscriptionWithShopify(
  shopDomain: string,
  accessToken: string
): Promise<Plan> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop) return "FREE";

  let activeCharges: Array<{ id: string; name: string; status: string }> = [];
  try {
    const data = await shopifyGraphQL(shopDomain, accessToken, `{
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
        }
      }
    }`);
    activeCharges = data?.currentAppInstallation?.activeSubscriptions ?? [];
  } catch (err) {
    console.error("[Billing] Could not fetch Shopify activeSubscriptions:", err);
    // Cannot verify — return what DB says (don't reset)
    return (shop.subscription?.plan as Plan) ?? "FREE";
  }

  if (activeCharges.length === 0) {
    // Shopify has no active subscription → merchant is on FREE
    const dbPlan = (shop.subscription?.plan as Plan) ?? "FREE";
    const dbStatus = shop.subscription?.status;

    if (dbPlan !== "FREE" || dbStatus !== "ACTIVE") {
      // DB is out of sync — reset to FREE (e.g. after uninstall/reinstall or declined charge)
      console.log(`[Billing] Sync: no active Shopify charge for ${shopDomain}, resetting to FREE`);
      if (dbPlan !== "FREE") {
        await handlePlanDowngrade(shop.id, "FREE");
      }
      await prisma.subscription.upsert({
        where: { shopId: shop.id },
        update: {
          plan: "FREE",
          pendingPlan: null,
          status: "ACTIVE",
          shopifySubscriptionId: null,
          shopifyConfirmationUrl: null,
          cancelledAt: dbPlan !== "FREE" ? new Date() : null,
        },
        create: {
          shopId: shop.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });
    }
    return "FREE";
  }

  // Has an active Shopify charge — derive plan from its name
  const activeCharge = activeCharges[0]!;
  const activePlan: Plan = NAME_TO_PLAN[activeCharge.name] ?? "FREE";

  // Sync DB to match Shopify
  const dbPlan = (shop.subscription?.plan as Plan) ?? "FREE";
  if (dbPlan !== activePlan || shop.subscription?.status !== "ACTIVE") {
    console.log(`[Billing] Sync: setting ${shopDomain} to plan=${activePlan} from Shopify`);
    await prisma.subscription.upsert({
      where: { shopId: shop.id },
      update: {
        plan: activePlan,
        pendingPlan: null,
        status: "ACTIVE",
        shopifySubscriptionId: activeCharge.id,
        shopifyConfirmationUrl: null,
        cancelledAt: null,
        currentPeriodStart: shop.subscription?.currentPeriodStart ?? new Date(),
        currentPeriodEnd: shop.subscription?.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        shopId: shop.id,
        plan: activePlan,
        status: "ACTIVE",
        shopifySubscriptionId: activeCharge.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await syncActiveSections(shop.id);
  }

  return activePlan;
}

// ── createShopifySubscription ────────────────────────────────────────────────
// Creates a Shopify recurring charge and returns the confirmation URL.
// The merchant is redirected to this URL to approve the charge.
// The plan is NOT activated until confirmSubscription() verifies approval.
export async function createShopifySubscription(
  shopDomain: string,
  plan: Plan,
  returnUrl: string,
  activeToken?: string
): Promise<{ confirmationUrl: string; subscriptionId: string } | null> {
  if (plan === "FREE") {
    await cancelShopifySubscription(shopDomain, activeToken);
    return null;
  }

  const price = PLAN_PRICES[plan as Exclude<Plan, "FREE">];
  if (!price) return null;

  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) throw new Error("Shop not found");

  const accessToken = activeToken ?? shop.accessToken;

  const data = await shopifyGraphQL(shopDomain, accessToken, `
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
        userErrors { field message }
        confirmationUrl
        appSubscription { id status }
      }
    }
  `, {
    name: PLAN_NAMES[plan],
    returnUrl,
    test: true,
    lineItems: [{
      plan: {
        appRecurringPricingDetails: {
          price: { amount: price, currencyCode: "USD" },
          interval: "EVERY_30_DAYS",
        },
      },
    }],
  });

  const result = data?.appSubscriptionCreate;
  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }
  if (!result?.confirmationUrl || !result?.appSubscription?.id) {
    throw new Error("Unable to create subscription: missing confirmation URL from Shopify.");
  }

  // Store the pending charge URL so we can surface it if needed
  // but do NOT change the active plan — merchant hasn't approved yet
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {
      shopifyConfirmationUrl: result.confirmationUrl,
      pendingPlan: plan,
    },
    create: {
      shopId: shop.id,
      plan: "FREE",
      status: "ACTIVE",
      shopifyConfirmationUrl: result.confirmationUrl,
      pendingPlan: plan,
    },
  });

  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription.id,
  };
}

// ── confirmSubscription ──────────────────────────────────────────────────────
// Called when Shopify redirects back after merchant approves/declines.
// We verify the charge status directly with Shopify — never trust the URL alone.
export async function confirmSubscription(
  shopDomain: string,
  chargeId: string,
  accessToken: string
): Promise<{ success: boolean; plan: Plan }> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop) return { success: false, plan: "FREE" };

  // Verify the charge status with Shopify
  let chargeStatus = "";
  let chargeName = "";
  try {
    const data = await shopifyGraphQL(shopDomain, accessToken, `
      query getSubscription($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id
            name
            status
          }
        }
      }
    `, { id: chargeId });
    chargeStatus = data?.node?.status?.toUpperCase() ?? "";
    chargeName = data?.node?.name ?? "";
  } catch (err) {
    console.error("[Billing] Could not verify charge with Shopify:", err);
    return { success: false, plan: "FREE" };
  }

  if (chargeStatus === "ACTIVE") {
    const activePlan: Plan = NAME_TO_PLAN[chargeName] ?? "FREE";

    await prisma.subscription.update({
      where: { shopId: shop.id },
      data: {
        plan: activePlan,
        pendingPlan: null,
        status: "ACTIVE",
        shopifySubscriptionId: chargeId,
        shopifyConfirmationUrl: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelledAt: null,
      },
    });

    await syncActiveSections(shop.id);
    console.log(`[Billing] Activated plan=${activePlan} for ${shopDomain}`);
    return { success: true, plan: activePlan };
  }

  // DECLINED or any other status — clear pending, leave plan unchanged
  await prisma.subscription.update({
    where: { shopId: shop.id },
    data: { pendingPlan: null, shopifyConfirmationUrl: null },
  });
  console.log(`[Billing] Charge ${chargeId} not active (status=${chargeStatus}) for ${shopDomain}`);
  return { success: false, plan: (shop.subscription?.plan as Plan) ?? "FREE" };
}

// ── cancelShopifySubscription ────────────────────────────────────────────────
// Cancels the active Shopify subscription via API, then resets to FREE.
export async function cancelShopifySubscription(
  shopDomain: string,
  accessToken?: string
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  if (!shop) return;

  const token = accessToken ?? shop.accessToken;
  const subscriptionId = shop.subscription?.shopifySubscriptionId;

  // Cancel on Shopify if we have an active subscription ID
  if (subscriptionId && token) {
    try {
      await shopifyGraphQL(shopDomain, token, `
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription { id status }
            userErrors { field message }
          }
        }
      `, { id: subscriptionId });
      console.log(`[Billing] Cancelled Shopify subscription ${subscriptionId} for ${shopDomain}`);
    } catch (err) {
      console.error("[Billing] Could not cancel Shopify subscription:", err);
      // Continue — still reset DB to FREE
    }
  }

  const previousPlan = (shop.subscription?.plan as Plan) ?? "FREE";
  if (previousPlan !== "FREE") {
    await handlePlanDowngrade(shop.id, "FREE");
  }

  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {
      plan: "FREE",
      pendingPlan: null,
      status: "ACTIVE",
      shopifySubscriptionId: null,
      shopifyConfirmationUrl: null,
      cancelledAt: new Date(),
      currentPeriodEnd: null,
    },
    create: {
      shopId: shop.id,
      plan: "FREE",
      status: "ACTIVE",
    },
  });

  console.log(`[Billing] ${shopDomain} downgraded to FREE`);
}

// ── handleSubscriptionWebhook ────────────────────────────────────────────────
// Handles app_subscriptions/update webhooks from Shopify.
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
  console.log(`[Webhook] Subscription status=${status} for ${shopDomain}`);

  if (status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED") {
    const currentPlan = (shop.subscription?.plan as Plan) ?? "FREE";
    if (currentPlan !== "FREE") {
      await handlePlanDowngrade(shop.id, "FREE");
    }
    await prisma.subscription.upsert({
      where: { shopId: shop.id },
      update: {
        plan: "FREE",
        pendingPlan: null,
        status: "ACTIVE",
        shopifySubscriptionId: null,
        cancelledAt: new Date(),
        currentPeriodEnd: null,
      },
      create: { shopId: shop.id, plan: "FREE", status: "ACTIVE" },
    });
  } else if (status === "ACTIVE") {
    const activePlan: Plan = NAME_TO_PLAN[payload.name] ?? "FREE";
    await prisma.subscription.upsert({
      where: { shopId: shop.id },
      update: {
        plan: activePlan,
        pendingPlan: null,
        status: "ACTIVE",
        shopifySubscriptionId: payload.id,
        shopifyConfirmationUrl: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelledAt: null,
      },
      create: {
        shopId: shop.id,
        plan: activePlan,
        status: "ACTIVE",
        shopifySubscriptionId: payload.id,
      },
    });
    await syncActiveSections(shop.id);
  }
}

// ── fetchActiveShopifySubscriptions ─────────────────────────────────────────
// Used by shopService during reinstall
export async function fetchActiveShopifySubscriptions(
  shopDomain: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  try {
    const data = await shopifyGraphQL(shopDomain, accessToken, `{
      currentAppInstallation {
        activeSubscriptions { id name status }
      }
    }`);
    return data?.currentAppInstallation?.activeSubscriptions ?? [];
  } catch {
    return [];
  }
}
