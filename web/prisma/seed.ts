// ============================================================
// Prisma Seed — Development / Demo data
// Run: npm run db:seed (from web/ directory)
// WARNING: This creates demo data only. Never run in production
//          with real merchant stores.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { TEMPLATES } from "../src/shared/templates.js";

const prisma = new PrismaClient();

async function main() {
  if (process.env["NODE_ENV"] === "production") {
    console.error("❌ Cannot run seed in production!");
    process.exit(1);
  }

  console.log("🌱 Starting seed...");

  // Create a demo shop
  const shop = await prisma.shop.upsert({
    where: { shopDomain: "demo-store.myshopify.com" },
    update: {},
    create: {
      shopDomain: "demo-store.myshopify.com",
      accessToken: "demo-access-token",
      email: "owner@demo-store.myshopify.com",
      name: "Demo Store",
      currency: "USD",
      timezone: "America/New_York",
      isActive: true,
    },
  });
  console.log(`✅ Shop created: ${shop.shopDomain}`);

  // Initialize subscription (Pro plan for demo)
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      plan: "PRO",
      status: "ACTIVE",
    },
  });
  console.log("✅ Subscription created: PRO");

  // Initialize usage
  await prisma.usage.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      activeSections: 0,
      totalCreated: 0,
    },
  });

  // Initialize settings
  await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: { shopId: shop.id },
  });

  // Create demo hero sections using the first 3 templates
  const demoSections = [
    {
      name: "Homepage Hero",
      templateId: "modern-split",
      configuration: {
        ...TEMPLATES[0]?.defaultConfig,
        heading: "Welcome to Our Store",
        description: "Discover our amazing collection of products.",
        primaryButtonText: "Shop Now",
        primaryButtonUrl: "/collections/all",
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        textColor: "#1a1a1a",
        headingColor: "#1a1a1a",
        backgroundColor: "#f8f8f8",
      },
      status: "ACTIVE" as const,
      isPublished: true,
    },
    {
      name: "Summer Sale Banner",
      templateId: "fullscreen-image",
      configuration: {
        ...TEMPLATES[1]?.defaultConfig,
        heading: "Summer Sale — Up to 40% Off",
        description: "Shop our best deals before they're gone.",
        primaryButtonText: "View Deals",
        primaryButtonUrl: "/collections/sale",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920",
        overlayOpacity: 0.5,
        textAlignment: "center",
      },
      status: "ACTIVE" as const,
      isPublished: false,
    },
    {
      name: "Gradient Hero (Draft)",
      templateId: "gradient",
      configuration: {
        ...TEMPLATES[6]?.defaultConfig,
        heading: "The Future of Shopping",
        description: "Explore our cutting-edge collection.",
        backgroundGradientStart: "#667eea",
        backgroundGradientEnd: "#764ba2",
      },
      status: "INACTIVE" as const,
      isPublished: false,
    },
  ];

  for (const section of demoSections) {
    await prisma.heroSection.create({
      data: {
        shopId: shop.id,
        name: section.name,
        templateId: section.templateId,
        configuration: section.configuration as Record<string, unknown>,
        status: section.status,
        isPublished: section.isPublished,
      },
    });
    console.log(`✅ Section created: ${section.name}`);
  }

  // Update usage count
  await prisma.usage.update({
    where: { shopId: shop.id },
    data: {
      activeSections: 2,
      totalCreated: 3,
    },
  });

  console.log("\n🎉 Seed complete!");
  console.log("   Demo shop: demo-store.myshopify.com");
  console.log("   Plan: PRO");
  console.log("   Sections: 3 created (2 active)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
