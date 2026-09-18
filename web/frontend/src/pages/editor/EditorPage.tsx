// ============================================================
// EditorPage — Visual editor with settings panel + live preview
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Tabs,
  TextField,
  Select,
  Checkbox,
  RangeSlider,
  ColorPicker,
  hsbToHex,
  hexToRgb,
  Divider,
  ButtonGroup,
  Badge,
  Toast,
  Frame,
} from "@shopify/polaris";
import {
  DesktopIcon,
  MobileIcon,
  SaveIcon,
  DuplicateIcon,
  DeleteIcon,
  RefreshIcon,
} from "@shopify/polaris-icons";
import { sectionsApi } from "../../lib/api";
import type { HeroSectionData, HeroConfig } from "@shared/types";
import { TEMPLATE_MAP } from "@shared/templates";
import { HeroPreview } from "../../components/editor/HeroPreview";
import { useAppContext } from "../../contexts/AppContext";

type PreviewMode = "desktop" | "tablet" | "mobile";

const PREVIEW_WIDTHS: Record<PreviewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

// Simple color input (using hex input since Polaris ColorPicker needs HSB)
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Text as="p" variant="bodySm">{label}</Text>
      <InlineStack gap="200" blockAlign="center">
        <div style={{ width: "28px", height: "28px", borderRadius: "4px", background: value, border: "1px solid #e1e3e5", flexShrink: 0 }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "40px", height: "28px", border: "1px solid #e1e3e5", borderRadius: "4px", cursor: "pointer", padding: "2px" }}
          aria-label={label}
        />
        <TextField
          label=""
          labelHidden
          value={value}
          onChange={onChange}
          autoComplete="off"
          prefix="#"
          placeholder="000000"
        />
      </InlineStack>
    </div>
  );
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useAppContext();

  const [section, setSection] = useState<HeroSectionData | null>(null);
  const [config, setConfig] = useState<HeroConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [activeTab, setActiveTab] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const originalConfig = useRef<HeroConfig>({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await sectionsApi.get(id);
      setSection(response.data);
      const loadedConfig = response.data.configuration as HeroConfig;
      setConfig(loadedConfig);
      originalConfig.current = loadedConfig;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load section.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const updateConfig = useCallback((updates: Partial<HeroConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      await sectionsApi.update(id, { configuration: config as Record<string, unknown> });
      originalConfig.current = config;
      setIsDirty(false);
      setToast("Hero section saved successfully!");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save section.");
    } finally {
      setSaving(false);
    }
  }, [id, config, refresh]);

  const handleReset = useCallback(() => {
    if (confirm("Reset to last saved version? Unsaved changes will be lost.")) {
      setConfig(originalConfig.current);
      setIsDirty(false);
    }
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!id) return;
    try {
      const response = await sectionsApi.duplicate(id);
      setToast("Section duplicated! Redirecting to new section...");
      setTimeout(() => navigate(`/sections/edit/${response.data.id}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to duplicate.");
    }
  }, [id, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id || !confirm("Delete this section? This cannot be undone.")) return;
    try {
      await sectionsApi.delete(id);
      await refresh();
      navigate("/sections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }, [id, navigate, refresh]);

  const template = section ? TEMPLATE_MAP.get(section.templateId) : null;

  if (loading) {
    return (
      <Page>
        <Layout><Layout.Section>
          <Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card>
        </Layout.Section></Layout>
      </Page>
    );
  }

  if (!section) {
    return (
      <Page>
        <Banner tone="critical">
          <Text as="p">Section not found.</Text>
        </Banner>
      </Page>
    );
  }

  const tabs = [
    { id: "content", content: "Content" },
    { id: "image", content: "Image" },
    { id: "background", content: "Background" },
    { id: "typography", content: "Typography" },
    { id: "layout", content: "Layout" },
    { id: "buttons", content: "Buttons" },
    { id: "animation", content: "Animation" },
  ];

  return (
    <Page
      title={section.name}
      subtitle={template?.name ?? section.templateId}
      backAction={{ content: "All Sections", onAction: () => navigate("/sections") }}
      primaryAction={{
        content: "Save",
        icon: SaveIcon,
        loading: saving,
        disabled: !isDirty,
        onAction: () => void handleSave(),
        id: "editor-save-btn",
      }}
      secondaryActions={[
        {
          content: "Duplicate",
          icon: DuplicateIcon,
          onAction: () => void handleDuplicate(),
        },
        {
          content: "Reset",
          icon: RefreshIcon,
          onAction: handleReset,
          disabled: !isDirty,
        },
        {
          content: "Delete",
          icon: DeleteIcon,
          tone: "critical",
          onAction: () => void handleDelete(),
        },
      ]}
    >
      {error && (
        <Layout>
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        </Layout>
      )}

      {isDirty && (
        <Layout>
          <Layout.Section>
            <Banner tone="warning">
              <Text as="p">You have unsaved changes.</Text>
            </Banner>
          </Layout.Section>
        </Layout>
      )}

      <Layout>
        {/* Settings Panel */}
        <Layout.Section variant="oneThird">
          <Card padding="0">
            <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab}>
              <Box padding="400">
                {activeTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Content</Text>
                    <TextField label="Heading" value={config.heading ?? ""} onChange={(v) => updateConfig({ heading: v })} autoComplete="off" id="editor-heading" />
                    <TextField label="Subheading" value={config.subheading ?? ""} onChange={(v) => updateConfig({ subheading: v })} autoComplete="off" id="editor-subheading" />
                    <TextField label="Description" value={config.description ?? ""} onChange={(v) => updateConfig({ description: v })} multiline={3} autoComplete="off" id="editor-description" />
                    <TextField label="Badge Text" value={config.badgeText ?? ""} onChange={(v) => updateConfig({ badgeText: v })} placeholder="SALE, NEW, etc." autoComplete="off" id="editor-badge" />
                    <Divider />
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Primary Button</Text>
                    <TextField label="Button Text" value={config.primaryButtonText ?? ""} onChange={(v) => updateConfig({ primaryButtonText: v })} autoComplete="off" id="editor-btn-text" />
                    <TextField label="Button URL" value={config.primaryButtonUrl ?? ""} onChange={(v) => updateConfig({ primaryButtonUrl: v })} autoComplete="off" prefix="https://" id="editor-btn-url" />
                    <Divider />
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Secondary Button</Text>
                    <TextField label="Button Text" value={config.secondaryButtonText ?? ""} onChange={(v) => updateConfig({ secondaryButtonText: v })} autoComplete="off" id="editor-sec-btn-text" />
                    <TextField label="Button URL" value={config.secondaryButtonUrl ?? ""} onChange={(v) => updateConfig({ secondaryButtonUrl: v })} autoComplete="off" id="editor-sec-btn-url" />
                    {/* Template-specific fields */}
                    {section.templateId === "countdown" && (
                      <>
                        <Divider />
                        <Text as="h3" variant="headingSm" fontWeight="semibold">Countdown</Text>
                        <TextField
                          label="End Date/Time"
                          type="datetime-local"
                          value={config.countdownEndDate ? new Date(config.countdownEndDate).toISOString().slice(0, 16) : ""}
                          onChange={(v) => updateConfig({ countdownEndDate: new Date(v).toISOString() })}
                          autoComplete="off"
                          id="editor-countdown-date"
                        />
                        <TextField
                          label="Completion Message"
                          value={config.countdownCompletionMessage ?? ""}
                          onChange={(v) => updateConfig({ countdownCompletionMessage: v })}
                          autoComplete="off"
                          id="editor-countdown-msg"
                        />
                      </>
                    )}
                    {section.templateId === "sale" && (
                      <>
                        <Divider />
                        <Text as="h3" variant="headingSm" fontWeight="semibold">Sale Details</Text>
                        <TextField label="Sale Text" value={config.saleText ?? ""} onChange={(v) => updateConfig({ saleText: v })} autoComplete="off" id="editor-sale-text" />
                        <TextField label="Discount Code" value={config.discountText ?? ""} onChange={(v) => updateConfig({ discountText: v })} autoComplete="off" id="editor-discount" />
                      </>
                    )}
                    {section.templateId === "product-showcase" && (
                      <>
                        <Divider />
                        <Text as="h3" variant="headingSm" fontWeight="semibold">Product Details</Text>
                        <TextField label="Product Title" value={config.productTitle ?? ""} onChange={(v) => updateConfig({ productTitle: v })} autoComplete="off" id="editor-product-title" />
                        <TextField label="Price" value={config.productPrice ?? ""} onChange={(v) => updateConfig({ productPrice: v })} autoComplete="off" prefix="$" id="editor-product-price" />
                        <TextField label="Product Description" value={config.productDescription ?? ""} onChange={(v) => updateConfig({ productDescription: v })} multiline={2} autoComplete="off" id="editor-product-desc" />
                      </>
                    )}
                  </BlockStack>
                )}

                {activeTab === 1 && (() => {
                  const features = template?.supportedFeatures ?? [];
                  const hasVideo = features.includes("video");
                  const hasImage = features.includes("image") || features.includes("image-fallback") || features.includes("dual-image");
                  const hasBeforeAfter = features.includes("before-after-slider") || features.includes("dual-image");
                  return (
                    <BlockStack gap="400">
                      {/* Video section — only for video templates */}
                      {hasVideo && (
                        <>
                          <Text as="h3" variant="headingSm" fontWeight="semibold">🎬 Video</Text>
                          <Banner tone="info">
                            <Text as="p" variant="bodySm">Paste a direct MP4 video URL (e.g. from Shopify CDN or a public CDN). YouTube/Vimeo links don't work here.</Text>
                          </Banner>
                          <TextField
                            label="Video URL (MP4 required)"
                            value={config.videoUrl ?? ""}
                            onChange={(v) => updateConfig({ videoUrl: v })}
                            autoComplete="off"
                            placeholder="https://cdn.shopify.com/videos/..."
                            id="editor-video-url"
                            helpText="Direct MP4 link only"
                          />
                          <TextField
                            label="Fallback Image (shown on mobile)"
                            value={config.videoFallbackImageUrl ?? ""}
                            onChange={(v) => updateConfig({ videoFallbackImageUrl: v })}
                            autoComplete="off"
                            placeholder="https://..."
                            id="editor-video-fallback"
                          />
                          <Divider />
                        </>
                      )}

                      {/* Before/After images */}
                      {hasBeforeAfter && (
                        <>
                          <Text as="h3" variant="headingSm" fontWeight="semibold">Before / After Images</Text>
                          <TextField label="Before Image URL" value={config.beforeImageUrl ?? ""} onChange={(v) => updateConfig({ beforeImageUrl: v })} autoComplete="off" placeholder="https://..." id="editor-before-url" />
                          <TextField label="After Image URL" value={config.afterImageUrl ?? ""} onChange={(v) => updateConfig({ afterImageUrl: v })} autoComplete="off" placeholder="https://..." id="editor-after-url" />
                          <Divider />
                        </>
                      )}

                      {/* Standard image */}
                      {hasImage && (
                        <>
                          <Text as="h3" variant="headingSm" fontWeight="semibold">Image</Text>
                          <TextField label="Image URL" value={config.imageUrl ?? ""} onChange={(v) => updateConfig({ imageUrl: v })} autoComplete="off" placeholder="https://..." id="editor-image-url" />
                          <TextField label="Image Alt Text" value={config.imageAlt ?? ""} onChange={(v) => updateConfig({ imageAlt: v })} autoComplete="off" id="editor-image-alt" />
                          <Select
                            label="Image Position"
                            options={[
                              { label: "Right", value: "right" },
                              { label: "Left", value: "left" },
                              { label: "Center", value: "center" },
                            ]}
                            value={config.imagePosition ?? "right"}
                            onChange={(v) => updateConfig({ imagePosition: v as HeroConfig["imagePosition"] })}
                            id="editor-image-position"
                          />
                          <Select
                            label="Image Fit"
                            options={[
                              { label: "Cover", value: "cover" },
                              { label: "Contain", value: "contain" },
                              { label: "Fill", value: "fill" },
                            ]}
                            value={config.imageFit ?? "cover"}
                            onChange={(v) => updateConfig({ imageFit: v as HeroConfig["imageFit"] })}
                            id="editor-image-fit"
                          />
                        </>
                      )}

                      {!hasVideo && !hasImage && !hasBeforeAfter && (
                        <Banner tone="info">
                          <Text as="p" variant="bodySm">This template uses a gradient or text-only background — no image is needed.</Text>
                        </Banner>
                      )}
                    </BlockStack>
                  );
                })()}

                {activeTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Background</Text>
                    <ColorInput label="Background Color" value={config.backgroundColor ?? "#ffffff"} onChange={(v) => updateConfig({ backgroundColor: v })} />
                    <Text as="p" variant="bodySm" tone="subdued">Gradient (overrides background color)</Text>
                    <ColorInput label="Gradient Start" value={config.backgroundGradientStart ?? "#667eea"} onChange={(v) => updateConfig({ backgroundGradientStart: v })} />
                    <ColorInput label="Gradient End" value={config.backgroundGradientEnd ?? "#764ba2"} onChange={(v) => updateConfig({ backgroundGradientEnd: v })} />
                    <TextField
                      label="Gradient Angle"
                      type="number"
                      value={String(config.backgroundGradientAngle ?? 135)}
                      onChange={(v) => updateConfig({ backgroundGradientAngle: parseInt(v) })}
                      suffix="°"
                      autoComplete="off"
                      id="editor-gradient-angle"
                    />
                    <Button variant="plain" onClick={() => updateConfig({ backgroundGradientStart: undefined, backgroundGradientEnd: undefined })} size="slim">
                      Clear gradient
                    </Button>
                    <Divider />
                    <ColorInput label="Overlay Color" value={config.overlayColor ?? "#000000"} onChange={(v) => updateConfig({ overlayColor: v })} />
                    <RangeSlider
                      label={`Overlay Opacity: ${Math.round((config.overlayOpacity ?? 0) * 100)}%`}
                      value={(config.overlayOpacity ?? 0) * 100}
                      onChange={(v) => updateConfig({ overlayOpacity: (v as number) / 100 })}
                      min={0}
                      max={100}
                      step={5}
                      id="editor-overlay-opacity"
                    />
                  </BlockStack>
                )}

                {activeTab === 3 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Typography</Text>
                    <ColorInput label="Heading Color" value={config.headingColor ?? "#ffffff"} onChange={(v) => updateConfig({ headingColor: v })} />
                    <ColorInput label="Text Color" value={config.textColor ?? "#ffffff"} onChange={(v) => updateConfig({ textColor: v })} />
                    <Select
                      label="Heading Size"
                      options={[
                        { label: "Small (24px)", value: "sm" },
                        { label: "Medium (32px)", value: "md" },
                        { label: "Large (42px)", value: "lg" },
                        { label: "XL (52px)", value: "xl" },
                        { label: "2XL (64px)", value: "2xl" },
                        { label: "3XL (80px)", value: "3xl" },
                      ]}
                      value={config.headingSize ?? "xl"}
                      onChange={(v) => updateConfig({ headingSize: v as HeroConfig["headingSize"] })}
                      id="editor-heading-size"
                    />
                    <Select
                      label="Heading Weight"
                      options={[
                        { label: "Normal", value: "normal" },
                        { label: "Medium", value: "medium" },
                        { label: "Semibold", value: "semibold" },
                        { label: "Bold", value: "bold" },
                        { label: "Extra Bold", value: "extrabold" },
                      ]}
                      value={config.headingWeight ?? "bold"}
                      onChange={(v) => updateConfig({ headingWeight: v as HeroConfig["headingWeight"] })}
                      id="editor-heading-weight"
                    />
                    <Select
                      label="Description Size"
                      options={[
                        { label: "Small", value: "sm" },
                        { label: "Medium", value: "md" },
                        { label: "Large", value: "lg" },
                      ]}
                      value={config.descriptionSize ?? "md"}
                      onChange={(v) => updateConfig({ descriptionSize: v as HeroConfig["descriptionSize"] })}
                      id="editor-desc-size"
                    />
                    <Select
                      label="Text Alignment"
                      options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                        { label: "Right", value: "right" },
                      ]}
                      value={config.textAlignment ?? "left"}
                      onChange={(v) => updateConfig({ textAlignment: v as HeroConfig["textAlignment"] })}
                      id="editor-text-align"
                    />
                  </BlockStack>
                )}

                {activeTab === 4 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Layout</Text>
                    <Select
                      label="Section Height"
                      options={[
                        { label: "Auto", value: "auto" },
                        { label: "400px", value: "400px" },
                        { label: "500px", value: "500px" },
                        { label: "600px", value: "600px" },
                        { label: "700px", value: "700px" },
                        { label: "800px", value: "800px" },
                        { label: "Full Viewport (100vh)", value: "100vh" },
                      ]}
                      value={config.sectionHeight ?? "600px"}
                      onChange={(v) => updateConfig({ sectionHeight: v })}
                      id="editor-height"
                    />
                    <Select
                      label="Content Width"
                      options={[
                        { label: "Narrow", value: "narrow" },
                        { label: "Medium", value: "medium" },
                        { label: "Wide", value: "wide" },
                        { label: "Full", value: "full" },
                      ]}
                      value={config.contentWidth ?? "wide"}
                      onChange={(v) => updateConfig({ contentWidth: v as HeroConfig["contentWidth"] })}
                      id="editor-content-width"
                    />
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Desktop Spacing</Text>
                    <TextField label="Padding Top (px)" type="number" value={String(config.desktopPaddingTop ?? 80)} onChange={(v) => updateConfig({ desktopPaddingTop: parseInt(v) })} autoComplete="off" id="editor-desktop-pt" />
                    <TextField label="Padding Bottom (px)" type="number" value={String(config.desktopPaddingBottom ?? 80)} onChange={(v) => updateConfig({ desktopPaddingBottom: parseInt(v) })} autoComplete="off" id="editor-desktop-pb" />
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Mobile Spacing</Text>
                    <TextField label="Padding Top (px)" type="number" value={String(config.mobilePaddingTop ?? 60)} onChange={(v) => updateConfig({ mobilePaddingTop: parseInt(v) })} autoComplete="off" id="editor-mobile-pt" />
                    <TextField label="Padding Bottom (px)" type="number" value={String(config.mobilePaddingBottom ?? 60)} onChange={(v) => updateConfig({ mobilePaddingBottom: parseInt(v) })} autoComplete="off" id="editor-mobile-pb" />
                  </BlockStack>
                )}

                {activeTab === 5 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Primary Button</Text>
                    <ColorInput label="Button Color" value={config.primaryButtonColor ?? "#000000"} onChange={(v) => updateConfig({ primaryButtonColor: v })} />
                    <ColorInput label="Button Text Color" value={config.primaryButtonTextColor ?? "#ffffff"} onChange={(v) => updateConfig({ primaryButtonTextColor: v })} />
                    <TextField label="Border Radius (px)" type="number" value={String(config.primaryButtonBorderRadius ?? 4)} onChange={(v) => updateConfig({ primaryButtonBorderRadius: parseInt(v) })} autoComplete="off" id="editor-btn-radius" />
                    <Select
                      label="Button Size"
                      options={[
                        { label: "Small", value: "small" },
                        { label: "Medium", value: "medium" },
                        { label: "Large", value: "large" },
                      ]}
                      value={config.primaryButtonSize ?? "medium"}
                      onChange={(v) => updateConfig({ primaryButtonSize: v as HeroConfig["primaryButtonSize"] })}
                      id="editor-btn-size"
                    />
                    <Divider />
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Secondary Button</Text>
                    <ColorInput label="Button Color" value={config.secondaryButtonColor ?? "transparent"} onChange={(v) => updateConfig({ secondaryButtonColor: v })} />
                    <ColorInput label="Button Text Color" value={config.secondaryButtonTextColor ?? "#000000"} onChange={(v) => updateConfig({ secondaryButtonTextColor: v })} />
                    <TextField label="Border Radius (px)" type="number" value={String(config.secondaryButtonBorderRadius ?? 4)} onChange={(v) => updateConfig({ secondaryButtonBorderRadius: parseInt(v) })} autoComplete="off" id="editor-sec-btn-radius" />
                  </BlockStack>
                )}

                {activeTab === 6 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">Animation</Text>
                    <Checkbox
                      label="Enable animation"
                      checked={config.enableAnimation ?? true}
                      onChange={(v) => updateConfig({ enableAnimation: v })}
                      id="editor-enable-animation"
                    />
                    <Select
                      label="Animation Type"
                      options={[
                        { label: "None", value: "none" },
                        { label: "Fade In", value: "fade" },
                        { label: "Slide Up", value: "slide-up" },
                        { label: "Slide Left", value: "slide-left" },
                        { label: "Zoom", value: "zoom" },
                      ]}
                      value={config.animationType ?? "fade"}
                      onChange={(v) => updateConfig({ animationType: v as HeroConfig["animationType"] })}
                      disabled={!config.enableAnimation}
                      id="editor-animation-type"
                    />
                    <TextField
                      label="Animation Duration (ms)"
                      type="number"
                      value={String(config.animationDuration ?? 800)}
                      onChange={(v) => updateConfig({ animationDuration: parseInt(v) })}
                      disabled={!config.enableAnimation}
                      autoComplete="off"
                      id="editor-animation-duration"
                    />
                    <TextField
                      label="Animation Delay (ms)"
                      type="number"
                      value={String(config.animationDelay ?? 0)}
                      onChange={(v) => updateConfig({ animationDelay: parseInt(v) })}
                      disabled={!config.enableAnimation}
                      autoComplete="off"
                      id="editor-animation-delay"
                    />
                    <Banner tone="info">
                      <Text as="p" variant="bodySm">
                        Animations are automatically disabled for users who have enabled "Reduce Motion" in their OS settings.
                      </Text>
                    </Banner>
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>

        {/* Live Preview */}
        <Layout.Section variant="twoThirds">
          <Card padding="0">
            {/* Preview toolbar */}
            <Box padding="300" borderBlockEndWidth="025" borderColor="border">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodySm" fontWeight="semibold">Live Preview</Text>
                <ButtonGroup variant="segmented">
                  <Button
                    pressed={previewMode === "desktop"}
                    icon={DesktopIcon}
                    onClick={() => setPreviewMode("desktop")}
                    id="preview-desktop"
                    size="slim"
                  >
                    Desktop
                  </Button>
                  <Button
                    pressed={previewMode === "tablet"}
                    onClick={() => setPreviewMode("tablet")}
                    id="preview-tablet"
                    size="slim"
                  >
                    Tablet
                  </Button>
                  <Button
                    pressed={previewMode === "mobile"}
                    icon={MobileIcon}
                    onClick={() => setPreviewMode("mobile")}
                    id="preview-mobile"
                    size="slim"
                  >
                    Mobile
                  </Button>
                </ButtonGroup>
              </InlineStack>
            </Box>

            {/* Preview frame */}
            <div
              style={{
                background: "#f6f6f7",
                padding: "24px",
                minHeight: "400px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                overflowX: "auto",
              }}
            >
              <style>{`
                @keyframes zix-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zix-slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes zix-slide-left { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes zix-zoom { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                @keyframes zix-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                @media (prefers-reduced-motion: reduce) {
                  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
                }
              `}</style>
              <div
                style={{
                  width: PREVIEW_WIDTHS[previewMode],
                  maxWidth: "100%",
                  transition: "width 0.3s ease",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                }}
              >
                <HeroPreview
                  templateId={section.templateId}
                  config={config}
                  previewMode={previewMode}
                />
              </div>
            </div>
          </Card>

          {/* Theme Editor instruction */}
          <Box paddingBlockStart="400">
            <Banner tone="info">
              <BlockStack gap="300">
                <Text as="p" fontWeight="semibold">Add to your Shopify theme</Text>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Option 1 — Add as a standalone section (recommended)</Text>
                  <Text as="p" variant="bodySm">
                    Go to <strong>Online Store → Themes → Customize</strong>. In the left panel, scroll to the bottom and click{" "}
                    <strong>Add section</strong>, then choose <strong>Apps → Zix Hero Sections</strong>.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Option 2 — Add as a block inside an existing section</Text>
                  <Text as="p" variant="bodySm">
                    Open any theme section that supports app blocks, click <strong>Add block</strong> at the bottom of that section's settings, then choose{" "}
                    <strong>Apps → Zix Hero Section</strong>.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Banner>
          </Box>
        </Layout.Section>
      </Layout>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, background: "#1a1a2e", color: "#fff", padding: "12px 24px", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", fontSize: "14px" }}>
          ✅ {toast}
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "12px", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>
      )}
    </Page>
  );
}
