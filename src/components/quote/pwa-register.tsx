"use client";

import { useEffect } from "react";

// Registers the service worker so the app works offline and is
// installable as a PWA (Progressive Web App).
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
