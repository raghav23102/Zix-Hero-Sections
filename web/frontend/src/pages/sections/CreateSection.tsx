// ============================================================
// Create Section Page — Template picker to start a new section
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Spinner,
  Box,
  Banner,
  TextField,
  Modal,
} from "@shopify/polaris";
import { LockIcon } from "@shopify/polaris-icons";
import { templatesApi, sectionsApi } from "../../lib/api";
import { useAppContext } from "../../contexts/AppContext";
import type { TemplateDefinition } from "@shared/types";
import { PlanBadge } from "../../components/shared/PlanBadge";

type TemplateWithAccess = TemplateDefinition & { isAccessible: boolean };

const TEMPLATE_ICONS: Record<string, string> = {
  "modern-split": "⚡", "fullscreen-image": "🖼️", "video-background": "🎬",
  "product-showcase": "🛒", fashion: "👗", minimal: "✨", gradient: "🌈",
  "image-cta": "📢", collection: "📦", sale: "🏷️", countdown: "⏱️",
  "before-after": "↔️", animated: "🎭", editorial: "💎",
};

const PLAN_BG: Record<string, string> = {
  FREE: "#e8f5e9", BASIC: "#e3f2fd", PRO: "#fff8e1", ULTIMATE: "#f3e5f5",
};

export function CreateSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usage, refresh } = useAppContext();
  const [templates, setTemplates] = useState<TemplateWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithAccess | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const preselectedId = (location.state as { templateId?: string } | null)?.templateId;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await templatesApi.list();
      setTemplates(response.data);
      if (preselectedId) {
        const t = response.data.find((t) => t.id === preselectedId);
        if (t?.isAccessible) {
          setSelectedTemplate(t);
          setSectionName(`My ${t.name}`);
          setModalOpen(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [preselectedId]);

  useEffect(() => { void load(); }, [load]);

  const handleSelectTemplate = (template: TemplateWithAccess) => {
    if (!template.isAccessible) {
      navigate("/billing");
      return;
    }
    setSelectedTemplate(template);
    setSectionName(`My ${template.name}`);
    setModalOpen(true);
  };

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || !sectionName.trim()) return;

    if (!usage?.canCreate) {
      setError("You've reached your plan limit. Upgrade to create more sections.");
      setModalOpen(false);
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const response = await sectionsApi.create({
        name: sectionName.trim(),
        templateId: selectedTemplate.id,
        configuration: selectedTemplate.defaultConfig as Record<string, unknown>,
      });

      await refresh();
      navigate(`/sections/edit/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create section.");
      setModalOpen(false);
    } finally {
      setCreating(false);
    }
  }, [selectedTemplate, sectionName, usage, navigate, refresh]);

  if (loading) {
    return (
      <Page title="Create Section">
        <Layout>
          <Layout.Section>
            <Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Create Hero Section" subtitle="Choose a template to get started">
      <Layout>
        {!usage?.canCreate && (
          <Layout.Section>
            <Banner tone="warning" action={{ content: "Upgrade Plan", onAction: () => navigate("/billing") }}>
              <Text as="p">
                You've reached your {usage?.plan} plan limit. Upgrade to create more hero sections.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {templates.map((template) => {
              const icon = TEMPLATE_ICONS[template.id] ?? "🎨";
              const bgColor = PLAN_BG[template.planRequired] ?? "#f4f4f4";
              const isLocked = !template.isAccessible;

              return (
                <div
                  key={template.id}
                  style={{
                    border: isLocked ? "1px solid #e1e3e5" : "2px solid transparent",
                    borderRadius: "12px",
                    overflow: "hidden",
                    cursor: "pointer",
                    opacity: isLocked ? 0.75 : 1,
                    transition: "all 0.2s ease",
                    background: "#fff",
                  }}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = isLocked ? "#e1e3e5" : "#5c6ac4";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${template.name} template`}
                  onKeyDown={(e) => e.key === "Enter" && handleSelectTemplate(template)}
                  id={`select-template-${template.id}`}
                >
                  <div
                    style={{
                      height: "140px",
                      background: bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      fontSize: "48px",
                    }}
                  >
                    {icon}
                    {isLocked && (
                      <div
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.6)",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                        }}
                      >
                        🔒
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px" }}>
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          {template.name}
                        </Text>
                        <PlanBadge plan={template.planRequired} />
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {template.description.substring(0, 80)}...
                      </Text>
                    </BlockStack>
                  </div>
                </div>
              );
            })}
          </div>
        </Layout.Section>
      </Layout>

      {/* Name Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Name your ${selectedTemplate?.name ?? "Hero Section"}`}
        primaryAction={{
          content: "Create Section",
          onAction: () => void handleCreate(),
          loading: creating,
          disabled: !sectionName.trim(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">
              Give your hero section a memorable name so you can find it easily later.
            </Text>
            <TextField
              label="Section name"
              value={sectionName}
              onChange={setSectionName}
              placeholder="e.g. Summer Sale Hero"
              autoComplete="off"
              id="section-name-input"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
