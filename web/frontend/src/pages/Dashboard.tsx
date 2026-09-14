// ============================================================
// Dashboard Page — Main overview with stats, usage, recent sections
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Badge,
  ProgressBar,
  DataTable,
  EmptyState,
  Spinner,
  Banner,
  Divider,
  Thumbnail,
  ButtonGroup,
} from "@shopify/polaris";
import {
  PlusCircleIcon,
  ThemeTemplateIcon,
  ArrowUpIcon,
  DeleteIcon,
  EditIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { useAppContext } from "../contexts/AppContext";
import { shopApi, sectionsApi } from "../lib/api";
import type { HeroSectionData } from "@shared/types";
import { SectionStatusBadge } from "../components/shared/SectionStatusBadge";
import { PlanBadge } from "../components/shared/PlanBadge";
import { StatCard } from "../components/shared/StatCard";

export function Dashboard() {
  const navigate = useNavigate();
  const { usage, stats, isLoading, error, refresh } = useAppContext();
  const [recentSections, setRecentSections] = useState<HeroSectionData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      const response = await shopApi.getDashboard();
      if (response.success) {
        setRecentSections(response.data.recentSections);
      }
    } catch {
      // handled by app context
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this hero section? This cannot be undone.")) return;
      try {
        setDeleteLoading(id);
        setDeleteError(null);
        await sectionsApi.delete(id);
        await Promise.all([loadDashboard(), refresh()]);
      } catch (err) {
        setDeleteError(
          err instanceof Error ? err.message : "Unable to delete section."
        );
      } finally {
        setDeleteLoading(null);
      }
    },
    [loadDashboard, refresh]
  );

  const usagePercent =
    usage && usage.sectionLimit > 0
      ? Math.min(100, (usage.activeSections / usage.sectionLimit) * 100)
      : 0;

  if (isLoading || dashboardLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center">
                  <Spinner size="large" />
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Dashboard"
      subtitle="Zix Hero Sections"
      primaryAction={{
        content: "Create Hero Section",
        icon: PlusCircleIcon,
        onAction: () => navigate("/sections/create"),
      }}
      secondaryActions={[
        {
          content: "Explore Templates",
          icon: ThemeTemplateIcon,
          onAction: () => navigate("/templates"),
        },
      ]}
    >
      <Layout>
        {/* Error banner */}
        {(error ?? deleteError) && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setDeleteError(null)}>
              <Text as="p">{error ?? deleteError}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Welcome Card */}
        <Layout.Section>
          <div
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              borderRadius: "12px",
              padding: "40px",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-60px",
                right: "80px",
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.03)",
              }}
            />
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h1" variant="headingXl" fontWeight="bold">
                  <span style={{ color: "#ffffff" }}>
                    Welcome to Zix Hero Sections ✨
                  </span>
                </Text>
                <Text as="p" variant="bodyLg">
                  <span style={{ color: "rgba(255,255,255,0.75)" }}>
                    Create beautiful hero sections for your Shopify store without coding.
                  </span>
                </Text>
              </BlockStack>
              <InlineStack gap="300">
                <Button
                  variant="primary"
                  size="large"
                  icon={PlusCircleIcon}
                  onClick={() => navigate("/sections/create")}
                  id="dashboard-create-btn"
                >
                  Create Hero Section
                </Button>
                <Button
                  variant="secondary"
                  size="large"
                  icon={ThemeTemplateIcon}
                  onClick={() => navigate("/templates")}
                  id="dashboard-templates-btn"
                >
                  Explore Templates
                </Button>
              </InlineStack>
            </BlockStack>
          </div>
        </Layout.Section>

        {/* Stats Cards */}
        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              title="Total Sections"
              value={String(stats?.totalSections ?? 0)}
              icon="📐"
            />
            <StatCard
              title="Active Sections"
              value={String(stats?.activeSections ?? 0)}
              icon="✅"
            />
            <StatCard
              title="Available Templates"
              value={String(stats?.availableTemplates ?? 2)}
              icon="🎨"
            />
            <StatCard
              title="Current Plan"
              value={usage?.plan ?? "FREE"}
              icon="⭐"
              action={
                usage?.plan !== "ULTIMATE"
                  ? { label: "Upgrade", onClick: () => navigate("/billing") }
                  : undefined
              }
            />
          </div>
        </Layout.Section>

        {/* Usage Card */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Plan Usage
                </Text>
                <PlanBadge plan={usage?.plan ?? "FREE"} />
              </InlineStack>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Sections Used
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {usage?.activeSections ?? 0} / {usage?.sectionLimit ?? 2}
                  </Text>
                </InlineStack>
                <ProgressBar
                  progress={usagePercent}
                  tone={usagePercent >= 100 ? "critical" : usagePercent >= 75 ? "warning" : "success"}
                  size="small"
                />
              </BlockStack>

              {usagePercent >= 100 && (
                <Banner tone="warning">
                  <Text as="p" variant="bodySm">
                    You've reached your {usage?.plan} plan limit.
                  </Text>
                </Banner>
              )}

              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Templates Available: {usage?.templateLimit ?? 2} of 14
                </Text>
              </BlockStack>

              {usage?.plan !== "ULTIMATE" && (
                <Button
                  variant="primary"
                  icon={ArrowUpIcon}
                  onClick={() => navigate("/billing")}
                  fullWidth
                  id="dashboard-upgrade-btn"
                >
                  Upgrade Plan
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Sections */}
        <Layout.Section variant="twoThirds">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Recent Sections
                </Text>
                <Button
                  variant="plain"
                  onClick={() => navigate("/sections")}
                >
                  View all
                </Button>
              </InlineStack>

              {recentSections.length === 0 ? (
                <EmptyState
                  heading="No hero sections yet"
                  image=""
                  action={{
                    content: "Create Hero Section",
                    onAction: () => navigate("/sections/create"),
                  }}
                >
                  <Text as="p">
                    Create your first beautiful hero section in minutes.
                  </Text>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  {recentSections.map((section) => (
                    <div key={section.id}>
                      <InlineStack align="space-between" blockAlign="center" gap="300">
                        <BlockStack gap="100">
                          <Text as="span" variant="bodyMd" fontWeight="medium">
                            {section.name}
                          </Text>
                          <InlineStack gap="200">
                            <Text as="span" variant="bodySm" tone="subdued">
                              {section.templateId}
                            </Text>
                            <SectionStatusBadge status={section.status} />
                          </InlineStack>
                        </BlockStack>
                        <ButtonGroup>
                          <Button
                            size="slim"
                            icon={EditIcon}
                            onClick={() => navigate(`/sections/edit/${section.id}`)}
                            accessibilityLabel={`Edit ${section.name}`}
                            id={`edit-section-${section.id}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="slim"
                            tone="critical"
                            icon={DeleteIcon}
                            loading={deleteLoading === section.id}
                            onClick={() => void handleDelete(section.id)}
                            accessibilityLabel={`Delete ${section.name}`}
                            id={`delete-section-${section.id}`}
                          >
                            Delete
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                      <Divider />
                    </div>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
