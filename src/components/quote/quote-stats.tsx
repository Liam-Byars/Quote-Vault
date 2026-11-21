"use client";

import {
  Heart,
  MessageSquareQuote,
  CalendarDays,
  Users,
  Star,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { QuoteStats } from "@/lib/quote-types";

const PIE_COLORS = [
  "#f59e20",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#14b8a6",
  "#f97316",
];

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

  const hasChartData = s && (s.monthlyCounts.some((m) => m.count > 0) || s.topAuthors.length > 0);

  return (
    <section aria-label="Stats overview" className="space-y-2.5">
      {/* Stat cards */}
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

      {/* Charts */}
      {hasChartData && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Monthly activity bar chart */}
          {s!.monthlyCounts.some((m) => m.count > 0) && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Quotes per month
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={s!.monthlyCounts}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top authors pie chart */}
          {s!.topAuthors.length > 0 && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Top quoters
              </div>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie
                      data={s!.topAuthors}
                      dataKey="count"
                      nameKey="author"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={60}
                      paddingAngle={2}
                    >
                      {s!.topAuthors.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {s!.topAuthors.map((a, i) => (
                    <div key={a.author} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate font-medium">{a.author}</span>
                      <span className="ml-auto text-muted-foreground">{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
