// ============================================================
// App.tsx — Root component with Polaris + Router
// ============================================================

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import enTranslations from "@shopify/polaris/locales/en.json";

import { AppProvider } from "./contexts/AppContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { AllSections } from "./pages/sections/AllSections";
import { MySections } from "./pages/sections/MySections";
import { CreateSection } from "./pages/sections/CreateSection";
import { EditorPage } from "./pages/editor/EditorPage";
import { Templates } from "./pages/Templates";
import { Billing } from "./pages/Billing";
import { Settings } from "./pages/Settings";

import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import createApp from "@shopify/app-bridge";

const urlParams = new URLSearchParams(window.location.search);
export const appBridgeConfig = {
  host: urlParams.get("host") || "",
  apiKey: process.env.SHOPIFY_API_KEY || "",
  forceRedirect: true
};

export const shopifyAppInstance = createApp(appBridgeConfig);

export default function App() {
  return (
    <PolarisProvider i18n={enTranslations}>
      <AppBridgeProvider config={appBridgeConfig}>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="sections" element={<AllSections />} />
                <Route path="sections/my" element={<MySections />} />
                <Route path="sections/create" element={<CreateSection />} />
                <Route path="sections/edit/:id" element={<EditorPage />} />
                <Route path="templates" element={<Templates />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AppBridgeProvider>
    </PolarisProvider>
  );
}
