// Daily reminder notifications for Quote Vault.
//
// Design constraints (free Spark plan, static export — no server):
//   * Settings live in IndexedDB so the service worker can read them on
//     `periodicsync`. localStorage would be invisible to the SW, and the
//     Cache API would get wiped by pwa-register's 24h stale-visit refresh.
//   * The SW fires the notification in the background on Chromium/Android
//     (~daily when the PWA is installed). iOS Safari has no background push
//     without a paid backend, so the client hook also checks whenever the
//     app is open — that covers everyone else.
//
// Shape stored at IDB key "settings" in DB "quote-vault-reminder":
export type ReminderSettings = {
  enabled: boolean;
  // 24h "HH:MM" string, local time. Default 20:00 (evening reflection).
  time: string;
  // "YYYY-MM-DD" (local) of the last day we fired a notification.
  // Prevents double-firing when both the SW and the client hook run.
  lastNotifiedDate: string;
  // Whether we've already asked for permission (so we don't re-prompt
  // annoyingly after a denial).
  permissionAsked: boolean;
  // Client-managed flag: did the user record at least one quote today?
  // The SW reads this to suppress a reminder that would otherwise nag a
  // user who already did the thing. `quoteDate` is the YYYY-MM-DD the flag
  // applies to (so a stale flag from yesterday doesn't suppress today).
  quotedToday: boolean;
  quoteDate: string;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: "20:00",
  lastNotifiedDate: "",
  permissionAsked: false,
  quotedToday: false,
  quoteDate: "",
};

const DB_NAME = "quote-vault-reminder";
const DB_VERSION = 1;
const STORE = "settings";
const SETTINGS_KEY = "settings";

// ── Minimal IndexedDB helper (no imports — works in SW + client) ───────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore — reminders are best-effort */
  }
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = await idbGet<Partial<ReminderSettings>>(SETTINGS_KEY);
  return { ...DEFAULT_REMINDER_SETTINGS, ...(stored ?? {}) };
}

export async function saveReminderSettings(
  s: ReminderSettings
): Promise<void> {
  await idbSet(SETTINGS_KEY, s);
}

// Update the `quotedToday` / `quoteDate` flag without clobbering the rest
// of the settings object (the SW may have updated lastNotifiedDate in the
// meantime). Read-modify-write.
export async function markQuotedToday(quoted: boolean): Promise<void> {
  const settings = await getReminderSettings();
  const today = localDateStr();
  const next: ReminderSettings = {
    ...settings,
    quotedToday: quoted,
    quoteDate: quoted ? today : "",
  };
  await idbSet(SETTINGS_KEY, next);
}

// ── Time helpers (local timezone) ──────────────────────────────────────────

// "YYYY-MM-DD" in the user's local timezone (NOT UTC — toISOString would
// shift dates forward/backward for non-UTC users).
export function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Minutes since local midnight for "now".
function nowMinutesLocal(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

// "HH:MM" → minutes since midnight.
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ── Notification permission ────────────────────────────────────────────────

export function notificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// ── Periodic Background Sync registration ──────────────────────────────────
// Only Chromium-based browsers support this. Returns true if registered.

const PERIODIC_TAG = "daily-reminder";

export async function registerPeriodicSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return false;
    // minInterval 12h — the browser picks a window within ~daily to fire.
    // We can't pick an exact time, but our own due-time check inside the
    // SW handler prevents firing before the user's chosen time.
    await (reg as ServiceWorkerRegistration & {
      periodicSync: {
        register: (
          tag: string,
          opts?: { minInterval?: number }
        ) => Promise<void>;
      };
    }).periodicSync.register(PERIODIC_TAG, {
      minInterval: 12 * 60 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterPeriodicSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return;
    await (reg as ServiceWorkerRegistration & {
      periodicSync: { unregister: (tag: string) => Promise<void> };
    }).periodicSync.unregister(PERIODIC_TAG);
  } catch {
    /* ignore */
  }
}

// ── Quote-today check ──────────────────────────────────────────────────────

// True if any quote's createdAt falls on today's local date.
export function hasQuoteToday(
  quotes: { createdAt: string }[]
): boolean {
  const today = localDateStr();
  return quotes.some((q) => {
    if (!q?.createdAt) return false;
    // createdAt is an ISO string; parse to local date and compare Y-M-D.
    const d = new Date(q.createdAt);
    if (Number.isNaN(d.getTime())) return false;
    return localDateStr(d) === today;
  });
}

// ── Fire a notification (prefers SW.showNotification, falls back to Notification) ──

export async function showReminderNotification(): Promise<void> {
  const title = "Quote Vault";
  const body =
    "Heard anything funny today? Write it down before you forget.";
  const opts: NotificationOptions = {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "daily-reminder",
    data: { url: "/" },
  };

  // Prefer the service worker (works in background + foreground).
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller
  ) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    } catch {
      /* fall through */
    }
  }
  // Fallback: direct Notification (foreground only, Chromium/Firefox).
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(title, opts);
    } catch {
      /* ignore */
    }
  }
}

// ── Core check: should we fire the reminder right now? ─────────────────────
//
// Returns true if a notification was actually shown.
// Safe to call repeatedly (from SW periodicsync OR from the client hook) —
// the lastNotifiedDate guard prevents duplicates within the same day.

export async function maybeFireReminder(
  quotes: { createdAt: string }[]
): Promise<boolean> {
  const settings = await getReminderSettings();
  if (!settings.enabled) return false;
  if (notificationPermission() !== "granted") return false;

  const now = new Date();
  const today = localDateStr(now);

  // Already notified today — don't fire again.
  if (settings.lastNotifiedDate === today) return false;

  // Not yet the reminder time today.
  if (nowMinutesLocal(now) < timeToMinutes(settings.time)) return false;

  // Already recorded a quote today — silently mark notified and skip.
  // (The user did the thing; no need to nag.)
  if (hasQuoteToday(quotes)) {
    await saveReminderSettings({ ...settings, lastNotifiedDate: today });
    return false;
  }

  await showReminderNotification();
  await saveReminderSettings({ ...settings, lastNotifiedDate: today });
  return true;
}
