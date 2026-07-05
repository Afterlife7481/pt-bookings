import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchJson } from "@/lib/api/fetch-json";
import type { OnboardingStatus } from "@/lib/services/onboarding";

export function useOnboarding() {
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

  return { status, loading, refresh };
}
