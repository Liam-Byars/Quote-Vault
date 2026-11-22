"use client";

import { useEffect } from "react";

// Registers the service worker AND handles two auto-refresh scenarios:
//
// 1. Stale visit: if the user hasn't opened the app in 24+ hours, clear
//    all caches and hard-reload so they get the latest version.
//
// 2. Service worker update: if a new version of the SW was deployed,
//    the browser detects it, installs the new SW, and we auto-reload
//    so the user sees the new code immediately.
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── 1. Stale visit check ──────────────────────────────────────────
    const LAST_VISIT_KEY = "qv-last-visit";
    const STALE_HOURS = 24;
    try {
      const last = localStorage.getItem(LAST_VISIT_KEY);
      const now = Date.now();
      if (last) {
        const hoursSince = (now - parseInt(last, 10)) / 3_600_000;
        if (hoursSince >= STALE_HOURS) {
          // Haven't visited in 24h+ — clear caches and reload fresh
          localStorage.setItem(LAST_VISIT_KEY, String(now));
          if ("caches" in window) {
            caches.keys().then((names) =>
              Promise.all(names.map((n) => caches.delete(n)))
            ).then(() => window.location.reload());
          } else {
            window.location.reload();
          }
          return; // Don't continue — page is reloading
        }
      }
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch {
      // localStorage might be blocked (in-app browsers) — skip
    }

    // ── 2. Service worker registration + update detection ────────────
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Listen for a new service worker being installed
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New SW installed — reload to get fresh content
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});

    // Listen for controller change (new SW took over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
