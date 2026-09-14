import { TemplateDefinition, HeroConfig } from "./types.js";

// ============================================================
// TEMPLATE REGISTRY
// The single source of truth for all 14 hero templates.
// To add a new template, add an entry here + create preview/liquid files.
// ============================================================

const defaultConfig: HeroConfig = {
  heading: "Beautiful Hero Section",
  subheading: "Create stunning first impressions",
  description:
    "Add a professional hero section to your store without any coding.",
  primaryButtonText: "Shop Now",
  primaryButtonUrl: "/collections/all",
  primaryButtonColor: "#000000",
  primaryButtonTextColor: "#ffffff",
  primaryButtonBorderRadius: 4,
  primaryButtonSize: "large",
  secondaryButtonText: "Learn More",
  secondaryButtonUrl: "#",
  secondaryButtonColor: "transparent",
  secondaryButtonTextColor: "#000000",
  imageUrl: "",
  imageAlt: "Hero image",
  imagePosition: "right",
  imageFit: "cover",
  backgroundColor: "#ffffff",
  overlayColor: "#000000",
  overlayOpacity: 0.4,
  headingSize: "xl",
  headingWeight: "bold",
  descriptionSize: "md",
  textAlignment: "left",
  textColor: "#ffffff",
  headingColor: "#ffffff",
  sectionHeight: "600px",
  contentWidth: "wide",
  desktopPaddingTop: 80,
  desktopPaddingBottom: 80,
  mobilePaddingTop: 60,
  mobilePaddingBottom: 60,
  contentPaddingX: 40,
  animationType: "fade",
  animationDuration: 800,
  animationDelay: 0,
  enableAnimation: true,
};

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "modern-split",
    name: "Modern Split Hero",
    description:
      "Clean split layout with content on the left and a large image on the right. Perfect for ecommerce product showcases.",
    category: "ecommerce",
    planRequired: "FREE",
    order: 1,
    supportedFeatures: ["image", "animation", "dual-cta"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Discover Something Beautiful",
      description:
        "Explore our curated collection and find your perfect match.",
      imagePosition: "right",
      textAlignment: "left",
      textColor: "#1a1a1a",
      headingColor: "#1a1a1a",
      backgroundColor: "#f8f8f8",
      sectionHeight: "600px",
    },
  },
  {
    id: "fullscreen-image",
    name: "Full Screen Image Hero",
    description:
      "Large full-screen background image with centered content overlay. Bold and impactful.",
    category: "visual",
    planRequired: "FREE",
    order: 2,
    supportedFeatures: ["image", "overlay", "animation"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Make a Bold Statement",
      description: "Your story. Your style. Your brand.",
      textAlignment: "center",
      sectionHeight: "100vh",
      overlayOpacity: 0.5,
    },
  },
  {
    id: "video-background",
    name: "Video Background Hero",
    description:
      "Full-width video background with overlay content. Includes mobile fallback image.",
    category: "media",
    planRequired: "PRO",
    order: 3,
    supportedFeatures: ["video", "image-fallback", "overlay", "animation"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Experience the Difference",
      description: "See our products in action.",
      textAlignment: "center",
      sectionHeight: "100vh",
      videoUrl: "",
      videoFallbackImageUrl: "",
      overlayOpacity: 0.5,
    },
  },
  {
    id: "product-showcase",
    name: "Product Showcase Hero",
    description:
      "Highlight a featured product with image, title, description and price. Drive conversions directly from the hero.",
    category: "product",
    planRequired: "BASIC",
    order: 4,
    supportedFeatures: ["image", "product-info", "animation"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Featured Product",
      productTitle: "Premium Collection",
      productDescription: "Crafted with precision and built to last.",
      productPrice: "$99.00",
      imagePosition: "left",
      textAlignment: "right",
      textColor: "#1a1a1a",
      headingColor: "#1a1a1a",
      backgroundColor: "#ffffff",
    },
  },
  {
    id: "fashion",
    name: "Fashion Ecommerce Hero",
    description:
      "Premium fashion editorial layout with large typography and dramatic imagery. Perfect for clothing stores.",
    category: "fashion",
    planRequired: "BASIC",
    order: 5,
    supportedFeatures: ["image", "animation", "editorial-typography"],
    defaultConfig: {
      ...defaultConfig,
      heading: "New Collection",
      subheading: "Spring / Summer 2025",
      description: "Effortless style for every occasion.",
      textAlignment: "left",
      headingSize: "3xl",
      headingWeight: "extrabold",
      sectionHeight: "700px",
      textColor: "#ffffff",
      headingColor: "#ffffff",
    },
  },
  {
    id: "minimal",
    name: "Minimal Hero",
    description:
      "Clean, white minimalist layout with strong typography. Lets your content breathe.",
    category: "minimal",
    planRequired: "BASIC",
    order: 6,
    supportedFeatures: ["animation", "typography"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Beautifully Simple.",
      description: "Quality products, zero clutter.",
      textAlignment: "center",
      textColor: "#1a1a1a",
      headingColor: "#1a1a1a",
      backgroundColor: "#ffffff",
      sectionHeight: "500px",
      overlayOpacity: 0,
      primaryButtonColor: "#1a1a1a",
      primaryButtonTextColor: "#ffffff",
      headingSize: "3xl",
      headingWeight: "extrabold",
    },
  },
  {
    id: "gradient",
    name: "Gradient Modern Hero",
    description:
      "Vibrant gradient background with large typography, decorative shapes, and subtle animations.",
    category: "modern",
    planRequired: "PRO",
    order: 7,
    supportedFeatures: ["gradient", "animation", "decorative-shapes"],
    defaultConfig: {
      ...defaultConfig,
      heading: "The Future of Shopping",
      description: "Discover products that make a difference.",
      textAlignment: "center",
      backgroundGradientStart: "#667eea",
      backgroundGradientEnd: "#764ba2",
      backgroundGradientAngle: 135,
      backgroundColor: "#667eea",
      textColor: "#ffffff",
      headingColor: "#ffffff",
      sectionHeight: "600px",
      primaryButtonColor: "#ffffff",
      primaryButtonTextColor: "#667eea",
    },
  },
  {
    id: "image-cta",
    name: "Image + CTA Hero",
    description:
      "Promotional hero combining a large image with compelling call-to-action content.",
    category: "promotional",
    planRequired: "PRO",
    order: 8,
    supportedFeatures: ["image", "animation", "dual-cta"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Limited Time Offer",
      description: "Get our best deals before they're gone.",
      imagePosition: "right",
      textAlignment: "left",
      textColor: "#ffffff",
      headingColor: "#ffffff",
      sectionHeight: "550px",
    },
  },
  {
    id: "collection",
    name: "Collection Hero",
    description:
      "Designed for Shopify collection pages. Showcase a collection with image, title, and descriptive content.",
    category: "collection",
    planRequired: "PRO",
    order: 9,
    supportedFeatures: ["image", "animation", "collection-info"],
    defaultConfig: {
      ...defaultConfig,
      collectionTitle: "Summer Collection",
      heading: "Explore Our Summer Collection",
      description: "Fresh styles for the season ahead.",
      textAlignment: "center",
      sectionHeight: "500px",
    },
  },
  {
    id: "sale",
    name: "Sale Promotion Hero",
    description:
      "High-impact sale and promotion hero with badge, discount messaging, and strong CTA.",
    category: "promotional",
    planRequired: "ULTIMATE",
    order: 10,
    supportedFeatures: ["image", "badge", "sale-messaging", "animation"],
    defaultConfig: {
      ...defaultConfig,
      badgeText: "SALE",
      heading: "Up to 50% Off",
      description: "Don't miss our biggest sale of the year.",
      saleText: "UP TO 50% OFF",
      discountText: "Use code: SAVE50",
      textAlignment: "center",
      textColor: "#ffffff",
      headingColor: "#ffffff",
      backgroundColor: "#c0392b",
      sectionHeight: "600px",
      primaryButtonColor: "#ffffff",
      primaryButtonTextColor: "#c0392b",
    },
  },
  {
    id: "countdown",
    name: "Countdown Hero",
    description:
      "Create urgency with a countdown timer hero. Configurable end date and completion message.",
    category: "promotional",
    planRequired: "ULTIMATE",
    order: 11,
    supportedFeatures: ["countdown", "animation", "image"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Offer Ends Soon",
      description: "Grab your favorites before time runs out.",
      countdownEndDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      countdownCompletionMessage: "The offer has ended. Check back soon!",
      textAlignment: "center",
      textColor: "#ffffff",
      headingColor: "#ffffff",
      sectionHeight: "600px",
    },
  },
  {
    id: "before-after",
    name: "Before & After Hero",
    description:
      "Interactive split-screen comparison slider. Perfect for beauty, skincare, and transformation products.",
    category: "interactive",
    planRequired: "ULTIMATE",
    order: 12,
    supportedFeatures: ["before-after-slider", "animation", "dual-image"],
    defaultConfig: {
      ...defaultConfig,
      heading: "See the Difference",
      description: "Real results. Real people. Real transformation.",
      beforeImageUrl: "",
      afterImageUrl: "",
      textAlignment: "center",
      sectionHeight: "600px",
    },
  },
  {
    id: "animated",
    name: "Animated Hero",
    description:
      "Modern hero with subtle fade, slide, and floating animations. Respects reduced-motion preferences.",
    category: "modern",
    planRequired: "ULTIMATE",
    order: 13,
    supportedFeatures: ["animation", "floating-elements", "image"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Welcome to the Future",
      description: "Where great design meets great products.",
      textAlignment: "center",
      animationType: "slide-up",
      animationDuration: 1000,
      enableAnimation: true,
      sectionHeight: "650px",
    },
  },
  {
    id: "editorial",
    name: "Premium Editorial Hero",
    description:
      "High-end editorial layout with dramatic typography and elegant spacing. For luxury, fashion, and lifestyle brands.",
    category: "luxury",
    planRequired: "ULTIMATE",
    order: 14,
    supportedFeatures: ["image", "editorial-typography", "animation"],
    defaultConfig: {
      ...defaultConfig,
      heading: "Luxury Redefined",
      subheading: "Exclusive Collection",
      description: "For those who demand the extraordinary.",
      textAlignment: "left",
      headingSize: "3xl",
      headingWeight: "extrabold",
      sectionHeight: "750px",
      textColor: "#ffffff",
      headingColor: "#ffffff",
    },
  },
];

// Template lookup map for O(1) access
export const TEMPLATE_MAP = new Map<string, TemplateDefinition>(
  TEMPLATES.map((t) => [t.id, t])
);

// Get templates accessible for a given plan
export function getAccessibleTemplates(plan: string): TemplateDefinition[] {
  const planOrder: Record<string, number> = {
    FREE: 0,
    BASIC: 1,
    PRO: 2,
    ULTIMATE: 3,
  };
  const merchantPlanOrder = planOrder[plan] ?? 0;
  return TEMPLATES.filter(
    (t) => (planOrder[t.planRequired] ?? 0) <= merchantPlanOrder
  );
}

// Check if a specific template is accessible for a plan
export function isTemplateAccessible(
  templateId: string,
  plan: string
): boolean {
  const template = TEMPLATE_MAP.get(templateId);
  if (!template) return false;
  const accessible = getAccessibleTemplates(plan);
  return accessible.some((t) => t.id === templateId);
}
