// ============================================================
// AppLayout — Native Shopify Navigation Menu + React Router sync
// ============================================================

import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Frame } from "@shopify/polaris";
import { NavigationMenu } from "@shopify/app-bridge-react";

const NAV_LINKS = [
  { label: "Dashboard",     destination: "/dashboard" },
  { label: "Hero Sections", destination: "/sections" },
  { label: "Templates",     destination: "/templates" },
  { label: "Billing",       destination: "/billing" },
  { label: "Settings",      destination: "/settings" },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Shopify App Bridge NavigationMenu sets the URL via top-level navigation.
  // When the page reloads at e.g. /dashboard, React Router needs to match it.
  // We also need to handle the case where App Bridge changes the URL without
  // a full page reload by listening to location changes.

  const matcher = (link: { destination: string }) =>
    currentPath === link.destination || currentPath.startsWith(link.destination + "/");

  return (
    <Frame>
      <NavigationMenu
        navigationLinks={NAV_LINKS}
        matcher={matcher}
      />
      <Outlet />
    </Frame>
  );
}
