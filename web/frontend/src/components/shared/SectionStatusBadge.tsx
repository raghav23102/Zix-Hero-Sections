// ============================================================
// SectionStatusBadge — Visual badge for section status
// ============================================================

import React from "react";
import { Badge } from "@shopify/polaris";
import type { SectionStatus } from "@shared/types";

interface Props {
  status: SectionStatus;
}

export function SectionStatusBadge({ status }: Props) {
  switch (status) {
    case "ACTIVE":
      return <Badge tone="success">Active</Badge>;
    case "INACTIVE":
      return <Badge tone="warning">Inactive</Badge>;
    case "LOCKED":
      return <Badge tone="critical">Locked</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
