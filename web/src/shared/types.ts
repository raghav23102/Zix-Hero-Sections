// ============================================================
// ZIX HERO SECTIONS — Shared Types
// Used by both frontend and backend
// ============================================================

// ---- PLANS ----
export type Plan = "FREE" | "BASIC" | "PRO" | "ULTIMATE";

export const PLAN_LIMITS: Record<Plan, { sections: number; templates: number }> =
  {
    FREE: { sections: 2, templates: 2 },
    BASIC: { sections: 5, templates: 5 },
    PRO: { sections: 9, templates: 9 },
    ULTIMATE: { sections: 14, templates: 14 },
  };

export const PLAN_PRICES: Record<Exclude<Plan, "FREE">, number> = {
  BASIC: parseFloat(process.env["PRICE_BASIC"] ?? "29"),
  PRO: parseFloat(process.env["PRICE_PRO"] ?? "79"),
  ULTIMATE: parseFloat(process.env["PRICE_ULTIMATE"] ?? "129"),
};

export const PLAN_DISPLAY_NAMES: Record<Plan, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
  ULTIMATE: "Ultimate",
};

// ---- SECTION STATUS ----
export type SectionStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

// ---- HERO SECTION CONFIGURATION ----
// The universal config schema shared by ALL 14 templates.
// Each template uses only the fields relevant to it.
export interface HeroConfig {
  // Content
  heading?: string;
  subheading?: string;
  description?: string;
  badgeText?: string;

  // Primary CTA
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  primaryButtonBorderRadius?: number;
  primaryButtonSize?: "small" | "medium" | "large";

  // Secondary CTA
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  secondaryButtonBorderRadius?: number;

  // Media
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: "left" | "right" | "center" | "top" | "bottom";
  imageFit?: "cover" | "contain" | "fill";
  videoUrl?: string;
  videoFallbackImageUrl?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;

  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientAngle?: number;
  overlayColor?: string;
  overlayOpacity?: number;

  // Typography
  headingSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  headingWeight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  descriptionSize?: "sm" | "md" | "lg";
  textAlignment?: "left" | "center" | "right";
  textColor?: string;
  headingColor?: string;

  // Layout
  sectionHeight?: string; // e.g. "600px", "100vh", "auto"
  contentWidth?: "narrow" | "medium" | "wide" | "full";
  desktopPaddingTop?: number;
  desktopPaddingBottom?: number;
  mobilePaddingTop?: number;
  mobilePaddingBottom?: number;
  contentPaddingX?: number;

  // Animation
  animationType?: "none" | "fade" | "slide-up" | "slide-left" | "zoom";
  animationDuration?: number; // ms
  animationDelay?: number; // ms
  enableAnimation?: boolean;

  // Countdown (Template 11)
  countdownEndDate?: string; // ISO string
  countdownCompletionMessage?: string;

  // Sale / Badge (Template 10)
  saleText?: string;
  discountText?: string;

  // Product info (Template 04)
  productTitle?: string;
  productPrice?: string;
  productDescription?: string;

  // Collection (Template 09)
  collectionTitle?: string;

  // Template-specific extras
  extras?: Record<string, unknown>;
}

// ---- TEMPLATE DEFINITION ----
export type TemplatePlanTier = Plan; // which plan is needed to unlock

export interface TemplateDefinition {
  id: string; // e.g. "modern-split"
  name: string; // e.g. "Modern Split Hero"
  description: string;
  category: string;
  planRequired: TemplatePlanTier;
  order: number; // display order (1-14)
  defaultConfig: HeroConfig;
  supportedFeatures: string[]; // e.g. ["video", "countdown", "animation"]
}

// ---- HERO SECTION (API response shape) ----
export interface HeroSectionData {
  id: string;
  shopId: string;
  templateId: string;
  name: string;
  configuration: HeroConfig;
  status: SectionStatus;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  templateName?: string;
}

// ---- SUBSCRIPTION ----
export interface SubscriptionData {
  id: string;
  shopId: string;
  plan: Plan;
  status: string;
  shopifySubscriptionId?: string | null;
  shopifyConfirmationUrl?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- USAGE ----
export interface UsageData {
  activeSections: number;
  totalCreated: number;
  plan: Plan;
  sectionLimit: number;
  templateLimit: number;
  canCreate: boolean;
}

// ---- SHOP ----
export interface ShopData {
  id: string;
  shopDomain: string;
  email?: string | null;
  name?: string | null;
  currency?: string | null;
}

// ---- API RESPONSE SHAPES ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
