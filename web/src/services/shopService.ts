// ============================================================
// Shop Service — DB operations for shops
// ============================================================

import { prisma } from "../db.js";
import { Plan } from "../shared/types.js";
import { fetchActiveShopifySubscriptions } from "./billingService.js";

interface ShopifySession {
  shop: string;
  accessToken?: string;
}

/**
 * Called after OAuth completes to ensure the shop is in our DB.
 * Creates or updates the shop record and initializes subscription/usage/settings.
 *
 * BUG FIX (Bug B — reinstall): If the shop has a previous paid subscription in
 * the DB, we verify with Shopify whether it is still active. After an uninstall
 * Shopify cancels the charge automatically, so the DB must reflect that reality.
 */
export async function setupShop(session: ShopifySession): Promise<void> {
  const shopDomain = session.shop;
  const accessToken = session.accessToken ?? "";

  // Upsert shop
  const shop = await prisma.shop.upsert({
    where: { shopDomain },
    update: {
      accessToken,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      shopDomain,
      accessToken,
      isActive: true,
    },
  });

  // ── Check existing subscription ──────────────────────────────────────────
  const existingSub = await prisma.subscription.findUnique({
    where: { shopId: shop.id },
  });

  if (!existingSub) {
    // Brand new install — initialize with FREE
    await prisma.subscription.create({
      data: {
        shopId: shop.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });
  } else {
    // Reinstall path: if the stored subscription looks active/pending on a
    // paid plan, verify with Shopify. On reinstall Shopify auto-cancels the
    // old charge, so there will be 0 active subscriptions.
    const shouldVerify =
      existingSub.plan !== "FREE" &&
      (existingSub.status === "ACTIVE" || existingSub.status === "PENDING");

    if (shouldVerify && accessToken) {
      let hasActiveCharge = false;
      try {
        const activeCharges = await fetchActiveShopifySubscriptions(
          shopDomain,
          accessToken
        );
        hasActiveCharge = activeCharges.length > 0;
      } catch (err) {
        console.error("[ShopService] Could not verify Shopify subscriptions on reinstall:", err);
        // Err on the side of caution — reset to FREE
        hasActiveCharge = false;
      }

      if (!hasActiveCharge) {
        // Shopify has no active charge → previous subscription was cancelled
        // on uninstall. Mark it CANCELLED so the UI shows expiry info and
        // lets the merchant re-subscribe.
        console.log(
          `[ShopService] Reinstall detected for ${shopDomain}: no active Shopify charge found. ` +
          `Resetting subscription from ${existingSub.plan}/${existingSub.status} → FREE/CANCELLED.`
        );

        // Import here to avoid circular dependency at module load time
        const { handlePlanDowngrade } = await import("./usageService.js");
        await handlePlanDowngrade(shop.id, "FREE");

        await prisma.subscription.update({
          where: { shopId: shop.id },
          data: {
            plan: "FREE",
            pendingPlan: null,
            status: "CANCELLED",
            shopifySubscriptionId: null,
            shopifyConfirmationUrl: null,
            cancelledAt: existingSub.cancelledAt ?? new Date(),
          },
        });
      }
      // If hasActiveCharge is true, leave the subscription as-is (e.g. merchant
      // reinstalled without actually losing their billing).
    }
  }

  // Initialize usage if not exists
  await prisma.usage.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      activeSections: 0,
      totalCreated: 0,
    },
  });

  // Initialize settings if not exists
  await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
    },
  });

  console.log(`[ShopService] Shop setup complete: ${shopDomain}`);
}

export async function getShopByDomain(shopDomain: string) {
  return prisma.shop.findUnique({
    where: { shopDomain },
    include: {
      subscription: true,
      usage: true,
      settings: true,
    },
  });
}

export async function getShopById(shopId: string) {
  return prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      subscription: true,
      usage: true,
      settings: true,
    },
  });
}

/**
 * Get the current plan for a shop domain.
 */
export async function getShopPlan(shopDomain: string): Promise<Plan> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { subscription: true },
  });
  return (shop?.subscription?.plan as Plan) ?? "FREE";
}

/**
 * Mark shop as uninstalled (soft delete).
 */
export async function uninstallShop(shopDomain: string): Promise<void> {
  await prisma.shop.updateMany({
    where: { shopDomain },
    data: { isActive: false, accessToken: "" },
  });
  console.log(`[ShopService] Shop uninstalled: ${shopDomain}`);
}
