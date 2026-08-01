/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },
    // Never serve stale HTML/RSC after a deploy — common mobile PWA white-screen cause.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (request.mode === "navigate" ||
          request.destination === "document" ||
          request.headers.get("RSC") === "1"),
      handler: new NetworkOnly(),
    },
    // Prefer network for hashed Next chunks so a deploy cannot strand the app on 404s.
    {
      matcher: /\/_next\/static.+\.js$/i,
      handler: new NetworkFirst({
        cacheName: "next-static-js-assets",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 1440 * 60,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
