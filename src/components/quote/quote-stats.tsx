"use client";

import {
  Heart,
  MessageSquareQuote,
  CalendarDays,
  Users,
  Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuoteStats } from "@/lib/quote-types";

type Props = {
  data?: { stats: QuoteStats };
  isLoading: boolean;
};

export function QuoteStatsView({ data, isLoading }: Props) {
  const s = data?.stats;

  const items = [
    {
      label: "Total quotes",
      value: s?.total ?? 0,
      icon: MessageSquareQuote,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Favorites",
      value: s?.favorites ?? 0,
      icon: Heart,
      accent: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      label: "This month",
      value: s?.thisMonth ?? 0,
      icon: CalendarDays,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Avg funny",
      value: s?.avgRating ? `${s.avgRating}/5` : "—",
      icon: Star,
      accent: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <section aria-label="Stats overview">
      {/* Stat cards — horizontal scroll on mobile, grid on larger */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg}`}
              >
                <Icon className={`h-4.5 w-4.5 ${item.accent}`} />
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <p className="text-lg font-bold leading-none">
                    {item.value}
                  </p>
                )}
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top quoters */}
      {s && s.topAuthors.length > 0 && (
        <div className="relative mt-2.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide">
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Top quoters:
            </span>
            <div className="flex gap-1.5">
              {s.topAuthors.map((a, i) => (
                <span
                  key={a.author}
                  className="flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs shadow-sm"
                >
                  <span className="font-semibold text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="font-medium">{a.author}</span>
                  <span className="text-muted-foreground">{a.count}</span>
                </span>
              ))}
            </div>
          </div>
          {/* Right-edge fade hint that there is more to scroll */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
        </div>
      )}
    </section>
  );
}
