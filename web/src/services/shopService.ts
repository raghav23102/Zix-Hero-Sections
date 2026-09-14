// ============================================================
// Shop Service — DB operations for shops
// ============================================================

import { prisma } from "../db.js";
import { Plan } from "../../shared/types.js";

interface ShopifySession {
  shop: string;
  accessToken?: string;
}

/**
 * Called after OAuth completes to ensure the shop is in our DB.
 * Creates or updates the shop record and initializes subscription/usage/settings.
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

  // Initialize subscription if not exists
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      plan: "FREE",
      status: "ACTIVE",
    },
  });

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
