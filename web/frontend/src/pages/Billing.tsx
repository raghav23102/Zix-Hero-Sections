// ============================================================
// Billing Page — Professional pricing cards with Shopify billing
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
  Badge,
  List,
  Spinner,
  Box,
  Banner,
  Divider,
  Link,
} from "@shopify/polaris";
import { billingApi } from "../lib/api";
import { useAppContext } from "../contexts/AppContext";

interface SubscriptionInfo {
  plan: string;
  pendingPlan: string | null;
  status: string;
  cancelledAt: string | null;
  currentPeriodEnd: string | null;
  shopifyConfirmationUrl: string | null;
}

interface PlanData {
  id: string;
  name: string;
  price: number;
  sectionLimit: number;
  templateLimit: number;
  features: string[];
  isCurrent: boolean;
}

const PLAN_STYLES: Record<string, { gradient: string; badge: string; accent: string }> = {
  FREE:     { gradient: "linear-gradient(135deg, #f5f5f5, #e8e8e8)", badge: "#777", accent: "#555" },
  BASIC:    { gradient: "linear-gradient(135deg, #e3f2fd, #bbdefb)", badge: "#1565c0", accent: "#1976d2" },
  PRO:      { gradient: "linear-gradient(135deg, #fff8e1, #ffe082)", badge: "#f57f17", accent: "#f9a825" },
  ULTIMATE: { gradient: "linear-gradient(135deg, #f3e5f5, #ce93d8)", badge: "#6a1b9a", accent: "#8e24aa" },
};

const PLAN_DISPLAY: Record<string, string> = {
  FREE: "Free", BASIC: "Basic", PRO: "Pro", ULTIMATE: "Ultimate",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function Billing() {
  const [searchParams] = useSearchParams();
  const { shop, usage, refresh } = useAppContext();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");

  const isConfirmed = searchParams.get("confirmed") === "true";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await billingApi.getInfo();
      setPlans(response.data.plans);
      setCurrentPlan(response.data.currentPlan);
      setSubscription(response.data.subscription as SubscriptionInfo | null);
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

  // ── Subscribe / upgrade ──────────────────────────────────────────────────
  const handleSubscribe = useCallback(async (planId: string) => {
    if (planId === "FREE") {
      if (!confirm("Are you sure you want to downgrade to the Free plan? Excess sections will be locked.")) return;
      try {
        setSubscribing("FREE");
        await billingApi.cancel();
        setSuccess("You've been moved to the Free plan.");
        await Promise.all([load(), refresh()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to cancel subscription.");
      } finally {
        setSubscribing(null);
      }
      return;
    }

    try {
      setSubscribing(planId);
      setError(null);
      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = shop?.shopDomain || urlParams.get("shop") || "";
      const shopName = shopParam.replace(".myshopify.com", "");
      const apiKey = "b032eb456c32ff2cc4b6a036d39feb1c";
      const returnUrl = shopName
        ? `https://admin.shopify.com/store/${shopName}/apps/${apiKey}/billing?confirmed=true`
        : `${window.location.origin}/billing?confirmed=true`;

      const response = await billingApi.subscribe(planId, returnUrl);
      if (response.data?.confirmationUrl) {
        const target = window.top || window;
        target.location.href = response.data.confirmationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start subscription.");
      setSubscribing(null);
    }
  }, [load, refresh, shop?.shopDomain]);

  // ── Cancel pending subscription (if merchant went back without approving) ─
  const handleCancelPending = useCallback(async () => {
    if (!confirm("Cancel this pending subscription request? You can subscribe again at any time.")) return;
    try {
      setCancelling(true);
      await billingApi.cancel();
      setSuccess("Pending subscription cancelled. You remain on the Free plan.");
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel pending subscription.");
    } finally {
      setCancelling(false);
    }
  }, [load, refresh]);

  // ── Derived state ────────────────────────────────────────────────────────
  const isPending = subscription?.status === "PENDING";
  const pendingPlanId = subscription?.pendingPlan ?? (isPending ? subscription?.plan ?? null : null);
  const pendingPlanName = pendingPlanId ? (PLAN_DISPLAY[pendingPlanId] ?? pendingPlanId) : null;
  const confirmationUrl = subscription?.shopifyConfirmationUrl ?? null;

  // Reinstall: previous paid plan was cancelled on uninstall
  const previousPaidPlan =
    subscription &&
    ["CANCELLED", "EXPIRED", "DECLINED"].includes(subscription.status) &&
    subscription.plan !== "FREE"
      ? subscription.plan
      : null;

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

        {/* ── Success banner ─────────────────────────────────────────────── */}
        {success && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccess(null)}>
              <Text as="p">{success}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* ── PENDING: approval banner ────────────────────────────────────
            Shown when the merchant clicked Subscribe but hasn't approved yet.
            Their current plan is UNCHANGED until they click Approve on Shopify.
        ──────────────────────────────────────────────────────────────────── */}
        {isPending && pendingPlanName && (
          <Layout.Section>
            <Banner
              tone="info"
              title={`Approval required for ${pendingPlanName} plan`}
            >
              <BlockStack gap="300">
                <Text as="p">
                  You started a subscription to the <strong>{pendingPlanName}</strong> plan but
                  haven't approved it yet. <strong>Your current plan is unchanged</strong> — no
                  features have been unlocked or charged until you approve.
                </Text>
                <InlineStack gap="300" wrap={false}>
                  {confirmationUrl && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        const target = window.top || window;
                        target.location.href = confirmationUrl;
                      }}
                      id="pending-complete-approval"
                    >
                      Complete Approval →
                    </Button>
                  )}
                  <Button
                    tone="critical"
                    variant="plain"
                    loading={cancelling}
                    onClick={() => void handleCancelPending()}
                    id="pending-cancel"
                  >
                    Cancel Pending Request
                  </Button>
                </InlineStack>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {/* ── Reinstall: previous paid plan expired banner ────────────────── */}
        {previousPaidPlan && (
          <Layout.Section>
            <Banner
              tone="warning"
              title={`Your previous ${PLAN_DISPLAY[previousPaidPlan] ?? previousPaidPlan} plan has ended`}
            >
              <BlockStack gap="300">
                <Text as="p">
                  Your <strong>{PLAN_DISPLAY[previousPaidPlan] ?? previousPaidPlan}</strong> plan
                  was cancelled when the app was uninstalled
                  {subscription?.cancelledAt ? ` on ${formatDate(subscription.cancelledAt)}` : ""}.
                  You are currently on the <strong>Free</strong> plan.
                </Text>
                <div>
                  <Button
                    variant="primary"
                    loading={subscribing === previousPaidPlan}
                    onClick={() => void handleSubscribe(previousPaidPlan)}
                    id={`plan-resubscribe-${previousPaidPlan}`}
                  >
                    Re-subscribe to {PLAN_DISPLAY[previousPaidPlan] ?? previousPaidPlan} Plan
                  </Button>
                </div>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {/* ── Current usage ─────────────────────────────────────────────── */}
        {usage && (
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" gap="400">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Current Plan</Text>
                  {/* Show only the ACTIVE plan name — no PENDING badge here */}
                  <Text as="p" variant="headingMd" fontWeight="bold">
                    {PLAN_DISPLAY[currentPlan] ?? currentPlan}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Sections</Text>
                  <Text as="p" variant="headingMd">{usage.activeSections} / {usage.sectionLimit}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Templates Available</Text>
                  <Text as="p" variant="headingMd">{usage.templateLimit} / 14</Text>
                </BlockStack>
                {subscription?.currentPeriodEnd && subscription.status === "ACTIVE" && (
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">Next Billing Date</Text>
                    <Text as="p" variant="headingMd">{formatDate(subscription.currentPeriodEnd)}</Text>
                  </BlockStack>
                )}
              </InlineStack>
            </Card>
          </Layout.Section>
        )}

        {/* ── Pricing Cards ─────────────────────────────────────────────── */}
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {plans.map((plan) => {
              const style = (PLAN_STYLES[plan.id] ?? PLAN_STYLES["FREE"])!;
              // isCurrent is driven by backend (only true when ACTIVE matches plan)
              const isCurrentPlan = plan.isCurrent;
              const isPopular = plan.id === "PRO";
              // This plan has a pending charge awaiting approval
              const isPendingThisPlan = isPending && pendingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  style={{
                    border: isCurrentPlan
                      ? `2px solid ${style.accent}`
                      : "1px solid #e1e3e5",
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
                  {isPopular && !isCurrentPlan && (
                    <div style={{ position: "absolute", top: "16px", right: "16px", background: style.accent, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px" }}>
                      POPULAR
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div style={{ position: "absolute", top: "16px", left: "16px", background: style.accent, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px" }}>
                      CURRENT
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
                            ${plan.price}<span style={{ fontSize: "16px", fontWeight: 400 }}>/mo</span>
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
                        {isCurrentPlan ? (
                          // Currently active plan
                          <Button fullWidth disabled id={`plan-current-${plan.id}`}>
                            Current Plan
                          </Button>
                        ) : isPendingThisPlan && confirmationUrl ? (
                          // This plan has a pending charge — show "Complete Approval" link
                          <Button
                            fullWidth
                            variant="primary"
                            onClick={() => {
                              const target = window.top || window;
                              target.location.href = confirmationUrl;
                            }}
                            id={`plan-approve-${plan.id}`}
                          >
                            Complete Approval →
                          </Button>
                        ) : isPendingThisPlan ? (
                          // Pending but no confirmation URL stored
                          <Button fullWidth variant="primary"
                            loading={subscribing === plan.id}
                            onClick={() => void handleSubscribe(plan.id)}
                            id={`plan-resubmit-${plan.id}`}
                          >
                            Retry Subscription
                          </Button>
                        ) : plan.id === "FREE" && currentPlan !== "FREE" ? (
                          <Button
                            fullWidth
                            tone="critical"
                            variant="plain"
                            loading={subscribing === "FREE"}
                            onClick={() => void handleSubscribe("FREE")}
                            id={`plan-downgrade-${plan.id}`}
                          >
                            Downgrade to Free
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="primary"
                            loading={subscribing === plan.id}
                            onClick={() => void handleSubscribe(plan.id)}
                            id={`plan-subscribe-${plan.id}`}
                          >
                            {currentPlan === "FREE" || subscription?.status !== "ACTIVE"
                              ? `Subscribe to ${plan.name}`
                              : currentPlan < plan.id
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

        {/* FAQ / Note */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" fontWeight="semibold">Billing Information</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                All plans are billed monthly through Shopify. You can upgrade or downgrade at any time.
                When you upgrade, you get instant access to additional templates and sections.
                When you downgrade, your existing sections are preserved but excess sections are locked until you upgrade again.
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Payments are processed securely by Shopify. You can cancel anytime from your Shopify Admin under Apps.
                If you reinstall the app after uninstalling, your previous subscription will not be automatically restored —
                you will need to re-subscribe to your preferred plan.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
