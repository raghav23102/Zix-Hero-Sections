// ============================================================
// StatCard — Dashboard stat card
// ============================================================

import React from "react";
import { Card, Text, BlockStack, InlineStack, Button } from "@shopify/polaris";

interface StatCardProps {
  title: string;
  value: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
}

export function StatCard({ title, value, icon, action }: StatCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="200" blockAlign="center">
          {icon && <span style={{ fontSize: "20px" }}>{icon}</span>}
          <Text as="p" variant="bodySm" tone="subdued">
            {title}
          </Text>
        </InlineStack>
        <Text as="p" variant="headingXl" fontWeight="bold">
          {value}
        </Text>
        {action && (
          <Button
            variant="plain"
            size="slim"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </BlockStack>
    </Card>
  );
}
