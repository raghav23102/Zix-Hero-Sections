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
import { Provider as AppBridgeProvider, useAppBridge } from "@shopify/app-bridge-react";
import { setAppBridgeInstance } from "./lib/api";

import React, { useEffect, useState } from "react";

function AppBridgeInstanceCapturer({ children }: { children: React.ReactNode }) {
  const app = useAppBridge();
  setAppBridgeInstance(app);
  return <>{children}</>;
}

export default function App() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(data => {
        const urlParams = new URLSearchParams(window.location.search);
        // Use Vite-injected env var first, fallback to API
        const apiKey = process.env.SHOPIFY_API_KEY || data.apiKey || "";
        
        setConfig({
          host: urlParams.get("host") || data.hostName || "",
          apiKey: apiKey,
          forceRedirect: true
        });
      })
      .catch(console.error);
  }, []);

  if (!config) {
    return (
      <PolarisProvider i18n={enTranslations}>
        <div style={{ padding: "50px", textAlign: "center" }}>Loading App...</div>
      </PolarisProvider>
    );
  }

  return (
    <PolarisProvider i18n={enTranslations}>
      <AppBridgeProvider config={config}>
        <AppBridgeInstanceCapturer>
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
        </AppBridgeInstanceCapturer>
      </AppBridgeProvider>
    </PolarisProvider>
  );
}
