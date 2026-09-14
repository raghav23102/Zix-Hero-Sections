// ============================================================
// AppLayout — Polaris Frame with navigation
// ============================================================

import React, { useState, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Frame,
  Navigation,
  TopBar,
  Text,
  Icon,
  Badge,
} from "@shopify/polaris";
import {
  HomeIcon,
  LayoutSectionIcon,
  ThemeTemplateIcon,
  CreditCardIcon,
  SettingsIcon,
  PlusCircleIcon,
  ListBulletedIcon,
  PersonIcon,
} from "@shopify/polaris-icons";
import { useAppContext } from "../../contexts/AppContext";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { shop, usage } = useAppContext();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavigationToggle = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const currentPath = location.pathname;

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={handleNavigationToggle}
      userMenu={
        <TopBar.UserMenu
          actions={[
            {
              items: [
                {
                  content: "Settings",
                  onAction: () => navigate("/settings"),
                },
              ],
            },
          ]}
          name={shop?.name ?? shop?.shopDomain ?? "Your Store"}
          detail={usage?.plan ?? "FREE"}
          initials={(shop?.name ?? shop?.shopDomain ?? "Z")[0]?.toUpperCase() ?? "Z"}
          open={false}
          onToggle={() => {}}
        />
      }
    />
  );

  const navigationMarkup = (
    <Navigation location={currentPath}>
      <Navigation.Section
        items={[
          {
            url: "/dashboard",
            label: "Dashboard",
            icon: HomeIcon,
            selected: currentPath === "/dashboard",
            onClick: () => navigate("/dashboard"),
          },
        ]}
      />
      <Navigation.Section
        title="Hero Sections"
        items={[
          {
            url: "/sections",
            label: "All Sections",
            icon: LayoutSectionIcon,
            selected: currentPath === "/sections",
            onClick: () => navigate("/sections"),
          },
          {
            url: "/sections/my",
            label: "My Sections",
            icon: ListBulletedIcon,
            selected: currentPath === "/sections/my",
            onClick: () => navigate("/sections/my"),
          },
          {
            url: "/sections/create",
            label: "Create Section",
            icon: PlusCircleIcon,
            selected: currentPath === "/sections/create",
            onClick: () => navigate("/sections/create"),
          },
        ]}
      />
      <Navigation.Section
        items={[
          {
            url: "/templates",
            label: "Templates",
            icon: ThemeTemplateIcon,
            selected: currentPath === "/templates",
            onClick: () => navigate("/templates"),
          },
          {
            url: "/billing",
            label: "Billing",
            icon: CreditCardIcon,
            selected: currentPath === "/billing",
            onClick: () => navigate("/billing"),
            badge: usage?.plan === "FREE" ? "Upgrade" : undefined,
          },
          {
            url: "/settings",
            label: "Settings",
            icon: SettingsIcon,
            selected: currentPath === "/settings",
            onClick: () => navigate("/settings"),
          },
        ]}
      />
      {usage && (
        <Navigation.Section
          title={`Plan: ${usage.plan}`}
          items={[
            {
              label: `${usage.activeSections} / ${usage.sectionLimit} sections used`,
              icon: PersonIcon,
              disabled: true,
            },
          ]}
          separator
        />
      )}
    </Navigation>
  );

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavOpen}
      onNavigationDismiss={handleNavigationToggle}
      logo={{
        width: 86,
        topBarSource: "",
        contextualSaveBarSource: "",
        accessibilityLabel: "Zix Hero Sections",
        url: "/dashboard",
      }}
    >
      <Outlet />
    </Frame>
  );
}
