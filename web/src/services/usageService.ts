// ============================================================
// Usage Service — Track section usage & enforce plan limits
// ============================================================

import { prisma } from "../db.js";
import { Plan, PLAN_LIMITS, UsageData } from "../shared/types.js";

export async function getUsageData(
  shopDomain: string
): Promise<UsageData | null> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: {
      subscription: true,
      usage: true,
      _count: {
        select: {
          heroSections: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
  });

  if (!shop) return null;

  const plan = (shop.subscription?.plan as Plan) ?? "FREE";
  const limits = PLAN_LIMITS[plan];
  const activeSections = shop._count.heroSections;

  return {
    activeSections,
    totalCreated: shop.usage?.totalCreated ?? 0,
    plan,
    sectionLimit: limits.sections,
    templateLimit: limits.templates,
    canCreate: activeSections < limits.sections,
  };
}

export async function canCreateSection(shopDomain: string): Promise<boolean> {
  const usage = await getUsageData(shopDomain);
  return usage?.canCreate ?? false;
}

export async function incrementUsage(shopId: string): Promise<void> {
  await prisma.usage.upsert({
    where: { shopId },
    update: {
      totalCreated: { increment: 1 },
      lastActivityAt: new Date(),
    },
    create: {
      shopId,
      totalCreated: 1,
      activeSections: 0,
    },
  });
}

export async function syncActiveSections(shopId: string): Promise<void> {
  const count = await prisma.heroSection.count({
    where: { shopId, status: "ACTIVE" },
  });

  await prisma.usage.upsert({
    where: { shopId },
    update: {
      activeSections: count,
      lastActivityAt: new Date(),
    },
    create: {
      shopId,
      activeSections: count,
      totalCreated: count,
    },
  });
}

/**
 * When a plan is downgraded, lock excess sections.
 * We do NOT delete them — merchant keeps their data.
 */
export async function handlePlanDowngrade(
  shopId: string,
  newPlan: Plan
): Promise<number> {
  const newLimit = PLAN_LIMITS[newPlan].sections;
  const activeSections = await prisma.heroSection.findMany({
    where: { shopId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  if (activeSections.length <= newLimit) return 0;

  // Lock the oldest excess sections
  const sectionsToLock = activeSections.slice(newLimit);
  const idsToLock = sectionsToLock.map((s) => s.id);

  await prisma.heroSection.updateMany({
    where: { id: { in: idsToLock } },
    data: { status: "LOCKED" },
  });

  await syncActiveSections(shopId);
  return idsToLock.length;
}
