"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, InlineNotice } from "@/components/ui";
import {
  type BeforeInstallPromptEvent,
  canUseInstallPrompt,
  isIosSafari,
  isStandaloneDisplayMode,
} from "@/lib/pwa";

const COPY = {
  trainer: {
    pageDescription:
      "Add PT Bookings to your home screen for quick access to your schedule — like a native app, without the App Store.",
    installed:
      "You're using the installed app. Your schedule opens from your home screen.",
    iosStep3: "the app opens to your schedule",
    installFallback:
      "Open this page in Chrome on Android, or Safari on iPhone, to see install options. You can also use your browser menu to “Install app” or “Add to Home Screen”.",
  },
  client: {
    pageDescription:
      "Add PT Bookings to your home screen for quick access to your sessions — like a native app, without the App Store.",
    installed:
      "You're using the installed app. Your sessions open from your home screen.",
    iosStep3: "the app opens to your sessions",
    installFallback:
      "On iPhone, tap Share → Add to Home Screen while viewing this page to save your personal session link. On Android, use your browser menu to install or add a shortcut.",
  },
} as const;

export function InstallAppSection({
  embedded = false,
  variant = "trainer",
}: {
  embedded?: boolean;
  variant?: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplayMode());
    setShowIosHelp(isIosSafari() && !isStandaloneDisplayMode());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallMessage("App installed — open it from your home screen.");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;

    setInstalling(true);
    setInstallMessage(null);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallMessage("Installing… check your home screen in a moment.");
      } else {
        setInstallMessage(null);
      }
    } finally {
      setInstalling(false);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const canInstall = canUseInstallPrompt(installPrompt);

  const body = (
    <>
      {installed ? (
        <InlineNotice tone="success">{copy.installed}</InlineNotice>
      ) : (
        <div className="space-y-4">
          {canInstall && (
            <Button type="button" onClick={install} disabled={installing}>
              {installing ? "Installing…" : "Install app"}
            </Button>
          )}

          {showIosHelp && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">On iPhone or iPad</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Tap the <strong>Share</strong> button in Safari (square with
                  arrow)
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>
                </li>
                <li>
                  Tap <strong>Add</strong> — {copy.iosStep3}
                </li>
              </ol>
            </div>
          )}

          {!canInstall && !showIosHelp && (
            <p className="text-sm text-slate-500">{copy.installFallback}</p>
          )}

          {installMessage && (
            <InlineNotice tone="success">{installMessage}</InlineNotice>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-900">Install on your phone</h3>
      <p className="mt-1 text-sm text-slate-500">{copy.pageDescription}</p>
      <div className="mt-4">{body}</div>
    </Card>
  );
}
