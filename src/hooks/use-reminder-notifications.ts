"use client";

// React hook that wires daily-reminder notifications into the app lifecycle.
//
// Responsibilities:
//   1. Load settings from IDB and keep them in state for the settings UI.
//   2. Whenever `quotes` changes, run the maybe-fire check (covers the
//      "user just opened the app after their chosen reminder time" case).
//   3. Run the same check every 15 minutes while the app stays open
//      (covers "app left open past the reminder time").
//   4. When settings change, (un)register the periodic background sync so
//      the SW wakes up roughly once a day to fire the notification even
//      when the app is closed.
//
// This hook does NOT fire notifications from a server. There is no server
// (static export, free plan). The SW's `periodicsync` event is the only
// background delivery mechanism; the in-app checks here are the fallback
// for browsers without periodic sync (e.g. iOS Safari).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_REMINDER_SETTINGS,
  type ReminderSettings,
  getReminderSettings,
  saveReminderSettings,
  markQuotedToday,
  hasQuoteToday,
  requestNotificationPermission,
  notificationPermission,
  registerPeriodicSync,
  unregisterPeriodicSync,
  maybeFireReminder,
} from "@/lib/notifications";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function useReminderNotifications(
  quotes: { createdAt: string }[]
) {
  const [settings, setSettings] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    "default"
  );
  // Keep a live ref of quotes so the interval callback sees fresh data
  // without re-subscribing every time quotes change.
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;

  // Load settings + permission on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [loaded, perm] = await Promise.all([
        getReminderSettings(),
        Promise.resolve(notificationPermission()),
      ]);
      if (!alive) return;
      setSettings(loaded);
      setPermission(perm);
      // If already enabled + granted, make sure periodic sync is registered
      // (e.g. browser may have evicted it).
      if (loaded.enabled && perm === "granted") {
        void registerPeriodicSync();
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Run the maybe-fire check whenever quotes change (new quote = no need to
  // remind today; stale app open = remind if past time).
  useEffect(() => {
    // Keep the SW-readable quotedToday flag in sync so the background
    // periodic-sync handler can suppress a reminder if the user already
    // recorded a quote today. Best-effort — don't block the fire-check on it.
    void markQuotedToday(hasQuoteToday(quotes));
    if (settings.enabled && permission === "granted") {
      void maybeFireReminder(quotes);
    }
  }, [quotes, settings.enabled, permission]);

  // Periodic re-check while the app stays open.
  useEffect(() => {
    if (!settings.enabled || permission !== "granted") return;
    const id = window.setInterval(() => {
      void maybeFireReminder(quotesRef.current);
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [settings.enabled, permission]);

  // Update settings + handle side effects (permission request, periodic
  // sync registration). This is the function the settings UI calls.
  const update = useCallback(
    async (next: Partial<ReminderSettings>) => {
      setSettings((prev) => {
        const merged: ReminderSettings = { ...prev, ...next };
        // Persist + side effects happen async, outside the updater.
        (async () => {
          await saveReminderSettings(merged);
          if (merged.enabled && notificationPermission() !== "granted") {
            const result = await requestNotificationPermission();
            setPermission(result);
            if (result !== "granted") {
              // Permission denied — turn the toggle back off in state and
              // storage so the UI reflects reality.
              const reverted: ReminderSettings = {
                ...merged,
                enabled: false,
                permissionAsked: true,
              };
              await saveReminderSettings(reverted);
              setSettings(reverted);
              return;
            }
            // Permission granted — register background sync.
            void registerPeriodicSync();
          } else if (merged.enabled && notificationPermission() === "granted") {
            void registerPeriodicSync();
          } else if (!merged.enabled) {
            // Turning off — unregister so the SW stops waking up.
            void unregisterPeriodicSync();
          }
        })();
        return merged;
      });
    },
    []
  );

  // Fire a test notification immediately (ignores the due-time /
  // already-notified guards). Used by the "Test notification" button.
  const testNow = useCallback(async () => {
    if (notificationPermission() !== "granted") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    // Import lazily to avoid pulling showReminderNotification into the
    // initial bundle unnecessarily — it's only used on a button click.
    const { showReminderNotification } = await import("@/lib/notifications");
    await showReminderNotification();
  }, []);

  return { settings, permission, update, testNow };
}
