"use client";

// Header button (bell icon) + popover for daily-reminder settings.
//
// Wired to the useReminderNotifications hook, which is called once at the
// page level (so the same settings instance drives both the UI here and the
// background fire-checks). Props come from that hook.

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ReminderSettings } from "@/lib/notifications";

type Props = {
  settings: ReminderSettings;
  permission: NotificationPermission;
  onUpdate: (next: Partial<ReminderSettings>) => void;
  onTest: () => void;
};

export function ReminderSettings({
  settings,
  permission,
  onUpdate,
  onTest,
}: Props) {
  const denied = permission === "denied";
  // Show a subtle dot on the bell when reminders are active, so the user
  // can tell at a glance that the habit loop is armed.
  const active = settings.enabled && permission === "granted";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Daily reminders"
        >
          <Bell className="h-5 w-5" />
          {active && (
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold leading-tight">
                Daily reminder
              </p>
              <p className="text-xs text-muted-foreground">
                A nudge to write down what you heard today.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => onUpdate({ enabled: checked })}
              disabled={denied}
              aria-label="Toggle daily reminders"
            />
          </div>

          {denied ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Notifications are blocked in your browser settings. Enable them
              for Quote Vault to get daily reminders.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="reminder-time" className="text-xs">
                  Remind me at
                </Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={settings.time}
                  onChange={(e) => onUpdate({ time: e.target.value })}
                  className="h-8 w-28 text-sm"
                  disabled={!settings.enabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={onTest}
              >
                Send a test notification
              </Button>

              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                On Android &amp; desktop Chrome, reminders fire automatically
                once a day when the app is installed. On iPhone, you&apos;ll
                see the reminder when you open Quote Vault.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
