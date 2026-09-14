// ============================================================
// My Sections — Active sections for the merchant
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
  EmptyState,
  Spinner,
  Box,
  Banner,
  Badge,
} from "@shopify/polaris";
import { PlusCircleIcon, EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { sectionsApi } from "../../lib/api";
import { useAppContext } from "../../contexts/AppContext";
import type { HeroSectionData } from "@shared/types";
import { SectionStatusBadge } from "../../components/shared/SectionStatusBadge";

export function MySections() {
  const navigate = useNavigate();
  const { usage, refresh } = useAppContext();
  const [sections, setSections] = useState<HeroSectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sectionsApi.list({ status: "ACTIVE" });
      setSections(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await sectionsApi.delete(id);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }, [load, refresh]);

  if (loading) {
    return (
      <Page title="My Sections">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center"><Spinner size="large" /></InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="My Sections"
      subtitle="Your active hero sections"
      primaryAction={{
        content: "Create Hero Section",
        icon: PlusCircleIcon,
        disabled: !usage?.canCreate,
        onAction: () => navigate("/sections/create"),
      }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          {sections.length === 0 ? (
            <Card>
              <EmptyState
                heading="No active hero sections"
                image=""
                action={{ content: "Create Hero Section", onAction: () => navigate("/sections/create") }}
              >
                <Text as="p">Create and activate a hero section to see it here.</Text>
              </EmptyState>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {sections.map((section) => (
                <Card key={section.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        {section.name}
                      </Text>
                      <SectionStatusBadge status={section.status} />
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Template: {section.templateId}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {section.isPublished ? "✅ Published" : "📝 Draft"}
                    </Text>
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        icon={EditIcon}
                        onClick={() => navigate(`/sections/edit/${section.id}`)}
                        id={`my-edit-${section.id}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="slim"
                        tone="critical"
                        icon={DeleteIcon}
                        onClick={() => void handleDelete(section.id, section.name)}
                        id={`my-delete-${section.id}`}
                      >
                        Delete
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))}
            </div>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
