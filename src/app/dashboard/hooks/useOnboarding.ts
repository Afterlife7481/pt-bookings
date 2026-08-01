"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { fetchJson } from "@/lib/api/fetch-json";
import type { OnboardingStatus } from "@/lib/services/onboarding";

type OnboardingContextValue = {
  status: OnboardingStatus | null;
  loading: boolean;
  refresh: () => Promise<OnboardingStatus | undefined>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function useOnboardingState(): OnboardingContextValue {
  const pathname = usePathname();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchJson<OnboardingStatus>("/api/onboarding");
    setStatus(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().catch(() => setLoading(false));
  }, [refresh, pathname]);

  return useMemo(
    () => ({ status, loading, refresh }),
    [status, loading, refresh],
  );
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const value = useOnboardingState();
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
