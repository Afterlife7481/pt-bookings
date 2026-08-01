"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "ptb:chunk-reload";

function isChunkLoadFailure(message: string) {
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

function reloadOnce(storageKey: string) {
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Private mode may block sessionStorage; still try a single reload.
  }
  window.location.reload();
}

/**
 * After a deploy, the PWA service worker can briefly serve a shell that
 * references missing JS chunks. A refresh fixes it — do that automatically once.
 */
export function PwaRecovery() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isChunkLoadFailure(event.message ?? "")) {
        reloadOnce(CHUNK_RELOAD_KEY);
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : String(reason ?? "");
      if (isChunkLoadFailure(message)) {
        reloadOnce(CHUNK_RELOAD_KEY);
      }
    }

    // New SW took control after an update — reload once so HTML/JS stay in sync.
    let swReloading = false;
    function onControllerChange() {
      if (swReloading) return;
      swReloading = true;
      window.location.reload();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
