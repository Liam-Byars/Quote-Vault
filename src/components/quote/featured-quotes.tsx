"use client";

import { useMemo, useState } from "react";
import { Sparkles, CalendarHeart, X } from "lucide-react";
import type { Quote } from "@/lib/quote-types";
import { authorColor, initials } from "@/lib/quote-types";
import { cn } from "@/lib/utils";

type Props = {
  quotes: Quote[];
};

// Deterministic "quote of the day" — same quote all day, changes at midnight.
function getQuoteOfTheDay(quotes: Quote[]): Quote | null {
  if (quotes.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash * 31 + today.charCodeAt(i)) | 0;
  }
  return quotes[Math.abs(hash) % quotes.length];
}

// Quotes said on this day in previous years.
function getOnThisDay(quotes: Quote[]): Quote[] {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  const y = now.getFullYear();
  return quotes.filter((q) => {
    if (!q.dateSaid) return false;
    try {
      const dt = new Date(q.dateSaid);
      return dt.getMonth() === m && dt.getDate() === d && dt.getFullYear() < y;
    } catch {
      return false;
    }
  });
}

function timeAgo(iso: string): string {
  const years = new Date().getFullYear() - new Date(iso).getFullYear();
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

export function FeaturedQuotes({ quotes }: Props) {
  const [dismissedQotd, setDismissedQotd] = useState(false);
  const [dismissedOtd, setDismissedOtd] = useState(false);

  const qotd = useMemo(
    () => (dismissedQotd ? null : getQuoteOfTheDay(quotes)),
    [quotes, dismissedQotd]
  );
  const onThisDay = useMemo(
    () => (dismissedOtd ? [] : getOnThisDay(quotes)),
    [quotes, dismissedOtd]
  );

  if (!qotd && onThisDay.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Quote of the Day */}
      {qotd && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-lg">
          <button
            onClick={() => setDismissedQotd(true)}
            className="absolute right-3 top-3 rounded-full p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium opacity-80">
            <Sparkles className="h-3.5 w-3.5" />
            Quote of the Day
          </div>
          <p className="whitespace-pre-wrap text-lg font-medium leading-snug">
            &ldquo;{qotd.text}&rdquo;
          </p>
          <p className="mt-2 text-sm opacity-80">
            — {qotd.author || "Unknown"}
          </p>
        </div>
      )}

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarHeart className="h-3.5 w-3.5 text-primary" />
              On this day
            </div>
            <button
              onClick={() => setDismissedOtd(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {onThisDay.slice(0, 3).map((q) => (
              <div key={q.id} className="flex gap-2.5">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    authorColor(q.author || "Unknown")
                  )}
                >
                  {initials(q.author || "Unknown")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.author || "Unknown"} · {timeAgo(q.dateSaid!)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
