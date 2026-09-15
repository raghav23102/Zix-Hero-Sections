// ============================================================
// All Sections Page — List of all hero sections
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
  IndexTable,
  useIndexResourceState,
  Badge,
  ButtonGroup,
  Tooltip,
  Modal,
} from "@shopify/polaris";
import {
  PlusCircleIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
} from "@shopify/polaris-icons";
import { sectionsApi } from "../../lib/api";
import { useAppContext } from "../../contexts/AppContext";
import type { HeroSectionData } from "@shared/types";
import { SectionStatusBadge } from "../../components/shared/SectionStatusBadge";

export function AllSections() {
  const navigate = useNavigate();
  const { usage, refresh } = useAppContext();
  const [sections, setSections] = useState<HeroSectionData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{id: string, name: string} | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sectionsApi.list();
      setSections(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = useCallback((id: string, name: string) => {
    setSectionToDelete({ id, name });
    setDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!sectionToDelete) return;
    const { id, name } = sectionToDelete;
    try {
      setDeleteModalOpen(false);
      setActionLoading(id);
      setError(null);
      await sectionsApi.delete(id);
      setSuccessMsg(`"${name}" deleted successfully.`);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete section.");
    } finally {
      setActionLoading(null);
      setSectionToDelete(null);
    }
  }, [sectionToDelete, load, refresh]);

  const handleDuplicate = useCallback(
    async (id: string, name: string) => {
      try {
        setActionLoading(`dup-${id}`);
        setError(null);
        await sectionsApi.duplicate(id);
        setSuccessMsg(`"${name}" duplicated successfully.`);
        await Promise.all([load(), refresh()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to duplicate section.");
      } finally {
        setActionLoading(null);
      }
    },
    [load, refresh]
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <Page title="All Sections">
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
      title="All Sections"
      subtitle={`${total} section${total !== 1 ? "s" : ""} total`}
      primaryAction={{
        content: "Create Hero Section",
        icon: PlusCircleIcon,
        disabled: !usage?.canCreate,
        onAction: () => navigate("/sections/create"),
      }}
    >
      <Layout>
        {!usage?.canCreate && (
          <Layout.Section>
            <Banner
              tone="warning"
              action={{
                content: "Upgrade Plan",
                onAction: () => navigate("/billing"),
              }}
              secondaryAction={{
                content: "Manage Sections",
                onAction: () => load(),
              }}
            >
              <Text as="p">
                You've reached your {usage?.plan} plan limit ({usage?.sectionLimit}{" "}
                sections). Upgrade to create more.
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

        {successMsg && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccessMsg(null)}>
              <Text as="p">{successMsg}</Text>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {sections.length === 0 ? (
            <Card>
              <EmptyState
                heading="No hero sections yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: "Create Hero Section",
                  onAction: () => navigate("/sections/create"),
                }}
                secondaryAction={{
                  content: "Explore Templates",
                  onAction: () => navigate("/templates"),
                }}
              >
                <Text as="p">
                  Create your first beautiful hero section in minutes. No coding
                  required.
                </Text>
              </EmptyState>
            </Card>
          ) : (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "section", plural: "sections" }}
                itemCount={sections.length}
                headings={[
                  { title: "Name" },
                  { title: "Template" },
                  { title: "Status" },
                  { title: "Published" },
                  { title: "Created" },
                  { title: "Actions" },
                ]}
                selectable={false}
              >
                {sections.map((section, index) => (
                  <IndexTable.Row
                    id={section.id}
                    key={section.id}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {section.name}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {section.templateId}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <SectionStatusBadge status={section.status} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {section.isPublished ? (
                        <Badge tone="success">Published</Badge>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {formatDate(section.createdAt)}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          icon={EditIcon}
                          onClick={() =>
                            navigate(`/sections/edit/${section.id}`)
                          }
                          id={`edit-${section.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          icon={DuplicateIcon}
                          loading={actionLoading === `dup-${section.id}`}
                          onClick={() =>
                            void handleDuplicate(section.id, section.name)
                          }
                          id={`duplicate-${section.id}`}
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="slim"
                          tone="critical"
                          icon={DeleteIcon}
                          loading={actionLoading === section.id}
                          onClick={() =>
                            confirmDelete(section.id, section.name)
                          }
                          id={`delete-${section.id}`}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete "${sectionToDelete?.name}"?`}
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: executeDelete,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete this section? This cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
