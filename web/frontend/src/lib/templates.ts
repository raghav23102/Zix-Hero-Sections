// ============================================================
// Frontend — Template re-export for browser consumption
// Imports from the shared module using Vite alias resolution
// ============================================================

// This file exists because the frontend uses:
//   import { TEMPLATE_MAP } from "../../../../src/shared/templates"
// which resolves through the @shared Vite alias.
// No changes needed here — Vite handles the path resolution.

export { TEMPLATES, TEMPLATE_MAP, getAccessibleTemplates, isTemplateAccessible } from "@shared/templates";
