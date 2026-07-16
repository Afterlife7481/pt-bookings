/** Chromium install prompt — not in TypeScript DOM lib. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const isIos = isIosDevice();
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && !isOtherIosBrowser;
}

export function canUseInstallPrompt(
  event: BeforeInstallPromptEvent | null,
): boolean {
  return event != null && !isStandaloneDisplayMode();
}
