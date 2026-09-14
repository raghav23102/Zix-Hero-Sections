// ============================================================
// AppLayout — Native Shopify Navigation Menu
// ============================================================

import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Frame } from "@shopify/polaris";
import { NavigationMenu } from "@shopify/app-bridge-react";

export function AppLayout() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Ensure current path is highlighted in the native Shopify menu by configuring the matcher
  const matcher = (link: { destination: string }) => currentPath.startsWith(link.destination);

  return (
    <Frame>
      <NavigationMenu
        navigationLinks={[
          {
            label: "Dashboard",
            destination: "/dashboard",
          },
          {
            label: "Hero Sections",
            destination: "/sections",
          },
          {
            label: "Templates",
            destination: "/templates",
          },
          {
            label: "Billing",
            destination: "/billing",
          },
          {
            label: "Settings",
            destination: "/settings",
          },
        ]}
        matcher={matcher}
      />
      <Outlet />
    </Frame>
  );
}
