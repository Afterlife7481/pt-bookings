"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

const ERROR_RELOAD_KEY = "ptb:app-error-reload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = error.message ?? "";
    const looksLikeStaleChunk =
      /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        message,
      );

    if (!looksLikeStaleChunk) return;

    try {
      if (sessionStorage.getItem(ERROR_RELOAD_KEY)) return;
      sessionStorage.setItem(ERROR_RELOAD_KEY, "1");
      window.location.reload();
    } catch {
      // Fall through to manual retry UI.
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
      <p className="text-sm text-slate-600">
        If you just updated the app, try refreshing — that usually clears it.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(ERROR_RELOAD_KEY);
            } catch {
              // ignore
            }
            window.location.reload();
          }}
        >
          Refresh
        </Button>
        <Button type="button" variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
