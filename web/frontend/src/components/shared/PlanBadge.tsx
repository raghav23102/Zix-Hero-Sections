// ============================================================
// PlanBadge — Visual badge for plan tier
// ============================================================

import React from "react";
import { Badge } from "@shopify/polaris";
import type { Plan } from "@shared/types";

interface Props {
  plan: Plan | string;
}

const PLAN_TONES: Record<string, "info" | "success" | "warning" | "attention"> =
  {
    FREE: "info",
    BASIC: "success",
    PRO: "warning",
    ULTIMATE: "attention",
  };

export function PlanBadge({ plan }: Props) {
  const tone = PLAN_TONES[plan] ?? "info";
  return <Badge tone={tone}>{plan}</Badge>;
}
