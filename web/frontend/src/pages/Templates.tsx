// ============================================================
// Templates Page — Browse all 14 templates with plan gating
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
  Badge,
  Spinner,
  Box,
  Banner,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import { LockIcon, PlusCircleIcon } from "@shopify/polaris-icons";
import { templatesApi } from "../lib/api";
import { useAppContext } from "../contexts/AppContext";
import type { TemplateDefinition } from "@shared/types";
import { PlanBadge } from "../components/shared/PlanBadge";
import { TemplateThumbnail } from "../components/shared/TemplateThumbnail";

type TemplateWithAccess = TemplateDefinition & { isAccessible: boolean };

export function Templates() {
  const navigate = useNavigate();
  const { usage } = useAppContext();
  const [templates, setTemplates] = useState<TemplateWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await templatesApi.list();
      setTemplates(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  const filtered =
    filterCategory.length > 0
      ? templates.filter((t) => filterCategory.includes(t.category))
      : templates;

  if (loading) {
    return (
      <Page title="Templates">
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
      title="Hero Templates"
      subtitle={`${filtered.length} templates — ${usage?.templateLimit ?? 2} available on your plan`}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Upgrade prompt for non-ultimate */}
        {usage?.plan !== "ULTIMATE" && (
          <Layout.Section>
            <Banner
              tone="info"
              action={{
                content: "Upgrade Plan",
                onAction: () => navigate("/billing"),
              }}
            >
              <Text as="p">
                You have access to <strong>{usage?.templateLimit ?? 2}</strong> of 14
                templates on the <strong>{usage?.plan ?? "FREE"}</strong> plan.
                Upgrade to unlock all templates.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Template Grid */}
        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() =>
                  navigate("/sections/create", {
                    state: { templateId: template.id },
                  })
                }
                onUpgrade={() => navigate("/billing")}
              />
            ))}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// ---- Template Card ----
interface TemplateCardProps {
  template: TemplateWithAccess;
  onUse: () => void;
  onUpgrade: () => void;
}

function TemplateCard({ template, onUse, onUpgrade }: TemplateCardProps) {
  const isLocked = !template.isAccessible;

  return (
    <div
      style={{
        border: isLocked ? "1px solid #e1e3e5" : "1px solid #e1e3e5",
        borderRadius: "12px",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        background: "#ffffff",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Wireframe thumbnail preview */}
      <TemplateThumbnail templateId={template.id} isLocked={isLocked} />

      {/* Card Content */}
      <div style={{ padding: "16px" }}>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              {template.name}
            </Text>
            <PlanBadge plan={template.planRequired} />
          </InlineStack>

          <Text as="p" variant="bodySm" tone="subdued">
            {template.description}
          </Text>

          {/* Features */}
          <InlineStack gap="100" wrap>
            {template.supportedFeatures.slice(0, 3).map((f) => (
              <span
                key={f}
                style={{
                  fontSize: "11px",
                  background: "#f1f1f1",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  color: "#555",
                }}
              >
                {f}
              </span>
            ))}
          </InlineStack>

          <InlineStack gap="200">
            {isLocked ? (
              <Button
                variant="primary"
                size="slim"
                icon={LockIcon}
                onClick={onUpgrade}
                id={`upgrade-for-${template.id}`}
                fullWidth
              >
                Upgrade to {template.planRequired}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="slim"
                icon={PlusCircleIcon}
                onClick={onUse}
                id={`use-template-${template.id}`}
                fullWidth
              >
                Use Template
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </div>
    </div>
  );
}
