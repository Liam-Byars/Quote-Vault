"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/quote-types";

export function Reminders({ quotes }: { quotes: Quote[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || quotes.length === 0) return null;

  const sorted = [...quotes].sort((a, b) =>
    b.createdAt < a.createdAt ? -1 : 1
  );
  const last = sorted[0];
  const daysSince = Math.floor(
    (Date.now() - new Date(last.createdAt).getTime()) / 86400000
  );
  if (daysSince < 7) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <Bell className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-xs text-muted-foreground">
        It&apos;s been{" "}
        <span className="font-semibold text-foreground">{daysSince} days</span>{" "}
        since your last quote. Heard anything funny lately?
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
