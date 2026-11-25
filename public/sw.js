// Service worker for Quote Vault.
//
// Two jobs:
//   1. Cache the app shell so the app works offline.
//   2. Fire the daily reminder notification in the background (via the
//      `periodicsync` event) and focus the app when the notification is
//      tapped.
//
// When CACHE changes (version bump), the new SW installs, the old cache is
// evicted on activate, and pwa-register.tsx auto-reloads the page so the
// user sees the new code immediately.
const CACHE = "quote-vault-2.9.2.1";
const ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Don't cache Firebase API calls — those need to hit the network.
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebase")
  ) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached)
    )
  );
});

// ── Daily reminder: background periodic sync ───────────────────────────────
//
// Chromium browsers fire `periodicsync` ~once a day (when the PWA is
// installed) for each registered tag. We registered "daily-reminder" from
// the client (see notifications.ts). When it fires we:
//   1. Read reminder settings from IndexedDB (shared with the client).
//   2. Skip if disabled, permission not granted, or already notified today.
//   3. Skip if it's before the user's chosen reminder time today.
//   4. Skip if the user already recorded a quote today (flag written by
//      the client hook).
//   5. Otherwise show the notification and mark today as notified.
//
// This mirrors maybeFireReminder() in src/lib/notifications.ts — kept in
// sync deliberately. The SW can't import that module, so the logic is
// inlined here in plain JS.

const REMINDER_DB = "quote-vault-reminder";
const REMINDER_DB_VERSION = 1;
const REMINDER_STORE = "settings";
const REMINDER_KEY = "settings";

function openReminderDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(REMINDER_DB, REMINDER_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(REMINDER_STORE)) {
        db.createObjectStore(REMINDER_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readReminderSettings() {
  return new Promise((resolve) => {
    openReminderDB()
      .then((db) => {
        const tx = db.transaction(REMINDER_STORE, "readonly");
        const req = tx.objectStore(REMINDER_STORE).get(REMINDER_KEY);
        req.onsuccess = () => resolve(req.result || {});
        req.onerror = () => resolve({});
      })
      .catch(() => resolve({}));
  });
}

function writeReminderSettings(settings) {
  return new Promise((resolve) => {
    openReminderDB()
      .then((db) => {
        const tx = db.transaction(REMINDER_STORE, "readwrite");
        tx.objectStore(REMINDER_STORE).put(settings, REMINDER_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      })
      .catch(() => resolve());
  });
}

// "YYYY-MM-DD" in the user's local timezone (NOT UTC).
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function maybeFireReminderFromSW() {
  const settings = await readReminderSettings();
  if (!settings || !settings.enabled) return;

  // Notification permission isn't readable from the SW directly in all
  // browsers, but showNotification will no-op silently if permission is
  // missing. The client only registers periodic sync when permission is
  // granted, so in practice we're fine.
  const now = new Date();
  const today = localDateStr(now);

  if (settings.lastNotifiedDate === today) return;

  const parts = String(settings.time || "20:00").split(":").map(Number);
  const dueMinutes = (parts[0] || 0) * 60 + (parts[1] || 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < dueMinutes) return; // not yet time today

  // Suppress if the user already recorded a quote today (flag set by the
  // client hook). Mark today as notified either way so we don't keep
  // re-checking.
  if (settings.quotedToday && settings.quoteDate === today) {
    await writeReminderSettings({ ...settings, lastNotifiedDate: today });
    return;
  }

  await self.registration.showNotification("Quote Vault", {
    body: "Heard anything funny today? Write it down before you forget.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "daily-reminder",
    data: { url: "/" },
  });
  await writeReminderSettings({ ...settings, lastNotifiedDate: today });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-reminder") {
    event.waitUntil(maybeFireReminderFromSW());
  }
});

// When the user taps the notification, focus an existing Quote Vault tab if
// one is open, otherwise open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
        return null;
      })
  );
});
