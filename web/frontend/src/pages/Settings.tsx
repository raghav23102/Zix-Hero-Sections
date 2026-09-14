// ============================================================
// Settings Page
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
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
  Select,
  Checkbox,
  Divider,
  List,
} from "@shopify/polaris";
import { settingsApi } from "../lib/api";
import { useAppContext } from "../contexts/AppContext";

interface SettingsData {
  defaultHeadingFont: string;
  defaultButtonColor: string;
  defaultButtonTextColor: string;
  defaultSectionHeight: string;
  enableAnimations: boolean;
  notifyOnPublish: boolean;
}

export function Settings() {
  const { shop, usage } = useAppContext();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await settingsApi.get();
      setSettings(response.data as SettingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      await settingsApi.update(settings as Record<string, unknown>);
      setSuccess("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Settings"
      primaryAction={{
        content: "Save Settings",
        loading: saving,
        onAction: () => void handleSave(),
        id: "settings-save-btn",
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
        {success && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccess(null)}>
              <Text as="p">{success}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Store Info */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd" fontWeight="semibold">Store Information</Text>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="p" tone="subdued">Shop Domain</Text>
                  <Text as="p" fontWeight="medium">{shop?.shopDomain ?? "—"}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="p" tone="subdued">Email</Text>
                  <Text as="p" fontWeight="medium">{shop?.email ?? "—"}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="p" tone="subdued">Current Plan</Text>
                  <Text as="p" fontWeight="medium">{usage?.plan ?? "FREE"}</Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* App Preferences */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd" fontWeight="semibold">Default Hero Settings</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                These are the defaults applied when creating a new hero section.
              </Text>

              <Select
                label="Default Section Height"
                options={[
                  { label: "400px", value: "400px" },
                  { label: "500px", value: "500px" },
                  { label: "600px", value: "600px" },
                  { label: "700px", value: "700px" },
                  { label: "Full Viewport (100vh)", value: "100vh" },
                ]}
                value={settings?.defaultSectionHeight ?? "600px"}
                onChange={(v) => updateSetting("defaultSectionHeight", v)}
                id="settings-height"
              />

              <Divider />
              <Checkbox
                label="Enable animations by default"
                helpText="New hero sections will have animations enabled. Animations respect the user's reduced-motion system preference."
                checked={settings?.enableAnimations ?? true}
                onChange={(v) => updateSetting("enableAnimations", v)}
                id="settings-animations"
              />
              <Checkbox
                label="Notify when a section is published"
                checked={settings?.notifyOnPublish ?? true}
                onChange={(v) => updateSetting("notifyOnPublish", v)}
                id="settings-notify"
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Theme Integration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd" fontWeight="semibold">Theme Integration</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                To add a Zix Hero Section to your storefront, follow these steps:
              </Text>
              <List type="number">
                <List.Item>Go to <strong>Online Store → Themes</strong> in your Shopify Admin</List.Item>
                <List.Item>Click <strong>Customize</strong> on your active theme</List.Item>
                <List.Item>Navigate to the page where you want to add the hero section</List.Item>
                <List.Item>Click <strong>Add section</strong> → <strong>Apps</strong></List.Item>
                <List.Item>Select <strong>Zix Hero Sections</strong></List.Item>
                <List.Item>Configure the section settings in the Theme Editor</List.Item>
                <List.Item>Click <strong>Save</strong> to publish</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Support & Info */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm" fontWeight="semibold">Support</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Need help? Contact us at support@zixhero.com
                </Text>
                <Button variant="plain" id="settings-docs-btn">View Documentation</Button>
                <Button variant="plain" id="settings-support-btn">Contact Support</Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm" fontWeight="semibold">App Information</Text>
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm" tone="subdued">App Version</Text>
                    <Text as="p" variant="bodySm">1.0.0</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm" tone="subdued">API Version</Text>
                    <Text as="p" variant="bodySm">2024-01</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm" fontWeight="semibold">Legal</Text>
                <Button variant="plain" id="settings-privacy-btn">Privacy Policy</Button>
                <Button variant="plain" id="settings-terms-btn">Terms of Service</Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm" fontWeight="semibold" tone="critical">Uninstall</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  To uninstall Zix Hero Sections, go to <strong>Apps</strong> in your Shopify Admin and remove the app.
                  Your hero section configurations will be retained for 30 days.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
