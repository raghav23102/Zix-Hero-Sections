// ============================================================
// Billing Page — Simple standard Shopify billing UI
// Free plan by default. Merchant upgrades → Shopify approval → plan unlocks.
// Merchant downgrades → immediate free plan.
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  List,
  Spinner,
  Box,
  Banner,
  Divider,
} from "@shopify/polaris";
import { billingApi } from "../lib/api";
import { useAppContext } from "../contexts/AppContext";

interface PlanData {
  id: string;
  name: string;
  price: number;
  sectionLimit: number;
  templateLimit: number;
  features: string[];
  isCurrent: boolean;
}

const PLAN_STYLES: Record<string, { gradient: string; accent: string }> = {
  FREE:     { gradient: "linear-gradient(135deg, #f5f5f5, #e8e8e8)", accent: "#555" },
  BASIC:    { gradient: "linear-gradient(135deg, #e3f2fd, #bbdefb)", accent: "#1976d2" },
  PRO:      { gradient: "linear-gradient(135deg, #fff8e1, #ffe082)", accent: "#f9a825" },
  ULTIMATE: { gradient: "linear-gradient(135deg, #f3e5f5, #ce93d8)", accent: "#8e24aa" },
};

export function Billing() {
  const [searchParams] = useSearchParams();
  const { shop, usage, refresh } = useAppContext();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConfirmed = searchParams.get("confirmed") === "true";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await billingApi.getInfo();
      setPlans(res.data.plans);
      setCurrentPlan(res.data.currentPlan);
      const sub = res.data.subscription as any;
      setNextBillingDate(sub?.currentPeriodEnd ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing info.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (isConfirmed) {
      setSuccess("Your subscription has been activated! Enjoy your new plan.");
      void refresh();
    }
  }, [load, isConfirmed, refresh]);

  const handleSubscribe = useCallback(async (planId: string) => {
    // Downgrade to Free
    if (planId === "FREE") {
      if (!confirm("Downgrade to Free? Sections over your limit will be locked.")) return;
      try {
        setActionPlan("FREE");
        setError(null);
        await billingApi.cancel();
        setSuccess("You're now on the Free plan.");
        await Promise.all([load(), refresh()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to cancel subscription.");
      } finally {
        setActionPlan(null);
      }
      return;
    }

    // Upgrade / switch plan — redirect to Shopify billing approval
    try {
      setActionPlan(planId);
      setError(null);

      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = shop?.shopDomain || urlParams.get("shop") || "";
      const shopName = shopParam.replace(".myshopify.com", "");
      const apiKey = "b032eb456c32ff2cc4b6a036d39feb1c";
      const returnUrl = shopName
        ? `https://admin.shopify.com/store/${shopName}/apps/${apiKey}/billing?confirmed=true`
        : `${window.location.origin}/billing?confirmed=true`;

      const res = await billingApi.subscribe(planId, returnUrl);
      if (res.data?.confirmationUrl) {
        // Redirect to Shopify billing confirmation — must escape the iframe
        const target = window.top || window;
        target.location.href = res.data.confirmationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start subscription.");
      setActionPlan(null);
    }
  }, [shop?.shopDomain, load, refresh]);

  if (loading) {
    return (
      <Page title="Billing">
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
    <Page title="Billing" subtitle="Choose the plan that fits your store">
      <Layout>

        {success && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccess(null)}>
              <Text as="p">{success}</Text>
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

        {/* Current usage summary */}
        {usage && (
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" gap="400">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Current Plan</Text>
                  <Text as="p" variant="headingMd" fontWeight="bold">
                    {currentPlan === "FREE" ? "Free" :
                     currentPlan === "BASIC" ? "Basic" :
                     currentPlan === "PRO" ? "Pro" : "Ultimate"}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Sections Used</Text>
                  <Text as="p" variant="headingMd">{usage.activeSections} / {usage.sectionLimit}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Templates Available</Text>
                  <Text as="p" variant="headingMd">{usage.templateLimit} / 14</Text>
                </BlockStack>
                {nextBillingDate && currentPlan !== "FREE" && (
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">Next Billing Date</Text>
                    <Text as="p" variant="headingMd">
                      {new Date(nextBillingDate).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </Text>
                  </BlockStack>
                )}
              </InlineStack>
            </Card>
          </Layout.Section>
        )}

        {/* Pricing cards */}
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {plans.map((plan) => {
              const style = (PLAN_STYLES[plan.id] ?? PLAN_STYLES["FREE"])!;
              const isCurrent = plan.isCurrent;
              const isHigher = !isCurrent && plan.id !== "FREE" && plan.price > (plans.find(p => p.isCurrent)?.price ?? 0);
              const isPopular = plan.id === "PRO";

              return (
                <div
                  key={plan.id}
                  style={{
                    border: isCurrent ? `2px solid ${style.accent}` : "1px solid #e1e3e5",
                    borderRadius: "16px",
                    overflow: "hidden",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    background: "#fff",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* CURRENT badge */}
                  {isCurrent && (
                    <div style={{ position: "absolute", top: "16px", left: "16px", background: style.accent, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px" }}>
                      CURRENT
                    </div>
                  )}
                  {/* POPULAR badge (only on PRO if not current) */}
                  {isPopular && !isCurrent && (
                    <div style={{ position: "absolute", top: "16px", right: "16px", background: style.accent, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px" }}>
                      POPULAR
                    </div>
                  )}

                  {/* Plan header */}
                  <div style={{ background: style.gradient, padding: "32px 24px 24px" }}>
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingLg" fontWeight="bold" alignment="center">
                        <span style={{ color: style.accent }}>{plan.name}</span>
                      </Text>
                      <Text as="p" variant="headingXl" fontWeight="bold" alignment="center">
                        {plan.price === 0 ? (
                          <span style={{ color: "#1a1a1a" }}>Free</span>
                        ) : (
                          <span style={{ color: "#1a1a1a" }}>
                            ${plan.price}
                            <span style={{ fontSize: "16px", fontWeight: 400 }}>/mo</span>
                          </span>
                        )}
                      </Text>
                    </BlockStack>
                  </div>

                  {/* Plan features */}
                  <div style={{ padding: "24px" }}>
                    <BlockStack gap="300">
                      <div style={{ textAlign: "center" }}>
                        <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                          {plan.sectionLimit} Hero Sections
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {plan.templateLimit} Templates
                        </Text>
                      </div>

                      <Divider />

                      <List type="bullet" gap="extraTight">
                        {plan.features.map((feature, i) => (
                          <List.Item key={i}>
                            <Text as="span" variant="bodySm">{feature}</Text>
                          </List.Item>
                        ))}
                      </List>

                      <div style={{ paddingTop: "8px" }}>
                        {isCurrent ? (
                          <Button fullWidth disabled id={`plan-current-${plan.id}`}>
                            Current Plan
                          </Button>
                        ) : plan.id === "FREE" ? (
                          <Button
                            fullWidth
                            tone="critical"
                            variant="plain"
                            loading={actionPlan === "FREE"}
                            onClick={() => void handleSubscribe("FREE")}
                            id="plan-downgrade-free"
                          >
                            Downgrade to Free
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="primary"
                            loading={actionPlan === plan.id}
                            onClick={() => void handleSubscribe(plan.id)}
                            id={`plan-subscribe-${plan.id}`}
                          >
                            {currentPlan === "FREE"
                              ? `Subscribe to ${plan.name}`
                              : isHigher
                              ? `Upgrade to ${plan.name}`
                              : `Switch to ${plan.name}`}
                          </Button>
                        )}
                      </div>
                    </BlockStack>
                  </div>
                </div>
              );
            })}
          </div>
        </Layout.Section>

        {/* Billing info */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" fontWeight="semibold">Billing Information</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                All plans are billed monthly through Shopify. When you click Subscribe or Upgrade,
                you'll be taken to Shopify's approval page. Your plan only changes after you approve
                the charge — nothing is activated until then.
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                When you downgrade, sections over your new plan's limit will be locked (not deleted).
                They'll become available again if you upgrade. Payments are handled securely by Shopify.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
