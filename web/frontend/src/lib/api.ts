// ============================================================
// API Client — Typed fetch wrapper for backend API
// ============================================================

import type {
  HeroSectionData,
  UsageData,
  TemplateDefinition,
} from "@shared/types";

import { getSessionToken } from "@shopify/app-bridge-utils";
import { shopifyAppInstance } from "../App";

const BASE_URL = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let token = "";
  try {
    token = await getSessionToken(shopifyAppInstance);
  } catch (e) {
    console.warn("Could not retrieve session token", e);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { error?: string }).error ??
      "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ---- Sections API ----
export const sectionsApi = {
  list: (params?: { page?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.status) qs.set("status", params.status);
    return request<{
      success: boolean;
      data: HeroSectionData[];
      total: number;
    }>(`/sections?${qs}`);
  },

  get: (id: string) =>
    request<{
      success: boolean;
      data: HeroSectionData;
    }>(`/sections/${id}`),

  create: (body: {
    name: string;
    templateId: string;
    configuration?: Record<string, unknown>;
  }) =>
    request<{
      success: boolean;
      data: HeroSectionData;
    }>("/sections", { method: "POST", body: JSON.stringify(body) }),

  update: (
    id: string,
    body: {
      name?: string;
      configuration?: Record<string, unknown>;
      status?: string;
      isPublished?: boolean;
    }
  ) =>
    request<{
      success: boolean;
      data: HeroSectionData;
    }>(`/sections/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  duplicate: (id: string) =>
    request<{
      success: boolean;
      data: HeroSectionData;
    }>(`/sections/${id}/duplicate`, { method: "POST" }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/sections/${id}`, {
      method: "DELETE",
    }),
};

// ---- Templates API ----
export const templatesApi = {
  list: () =>
    request<{
      success: boolean;
      data: (TemplateDefinition & { isAccessible: boolean })[];
      plan: string;
    }>("/templates"),

  get: (id: string) =>
    request<{
      success: boolean;
      data: TemplateDefinition & { isAccessible: boolean };
    }>(`/templates/${id}`),
};

// ---- Billing API ----
export const billingApi = {
  getInfo: () =>
    request<{
      success: boolean;
      data: {
        currentPlan: string;
        subscription: unknown;
        plans: Array<{
          id: string;
          name: string;
          price: number;
          sectionLimit: number;
          templateLimit: number;
          features: string[];
          isCurrent: boolean;
        }>;
      };
    }>("/billing"),

  subscribe: (plan: string, returnUrl?: string) =>
    request<{
      success: boolean;
      data: { confirmationUrl: string; subscriptionId: string };
    }>("/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan, returnUrl }),
    }),

  cancel: () =>
    request<{ success: boolean; message: string }>("/billing/cancel", {
      method: "POST",
    }),
};

// ---- Shop API ----
export const shopApi = {
  getDashboard: () =>
    request<{
      success: boolean;
      data: {
        shop: { shopDomain: string; email?: string; name?: string };
        usage: UsageData;
        stats: {
          totalSections: number;
          activeSections: number;
          availableTemplates: number;
          currentPlan: string;
        };
        recentSections: HeroSectionData[];
      };
    }>("/shop/dashboard"),
};

// ---- Settings API ----
export const settingsApi = {
  get: () =>
    request<{ success: boolean; data: Record<string, unknown> }>("/settings"),

  update: (data: Record<string, unknown>) =>
    request<{ success: boolean; data: Record<string, unknown> }>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ---- Auth API ----
export const authApi = {
  getSession: () =>
    request<{
      success: boolean;
      data: {
        shopDomain: string;
        plan: string;
        usage: UsageData;
      };
    }>("/auth/session"),
};
