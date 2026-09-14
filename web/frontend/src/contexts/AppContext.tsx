// ============================================================
// App Context — Global state (shop, plan, usage)
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { shopApi } from "../lib/api";
import type { UsageData } from "@shared/types";

interface ShopInfo {
  shopDomain: string;
  email?: string;
  name?: string;
}

interface Stats {
  totalSections: number;
  activeSections: number;
  availableTemplates: number;
  currentPlan: string;
}

interface AppContextValue {
  shop: ShopInfo | null;
  usage: UsageData | null;
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await shopApi.getDashboard();
      if (response.success && response.data) {
        setShop(response.data.shop);
        setUsage(response.data.usage);
        setStats(response.data.stats);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load app data.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppContext.Provider value={{ shop, usage, stats, isLoading, error, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
