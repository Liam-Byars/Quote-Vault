"use client";

import { Search, X, SlidersHorizontal, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { QuoteFilters } from "@/hooks/use-quotes";

type Props = {
  filters: QuoteFilters;
  onChange: (next: QuoteFilters) => void;
  authors: string[];
  tags: string[];
  resultCount: number;
};

export function QuoteFiltersBar({
  filters,
  onChange,
  authors,
  tags,
  resultCount,
}: Props) {
  const hasFilters =
    !!filters.q || !!filters.author || !!filters.tag || !!filters.favorite || !!filters.dateFrom || !!filters.dateTo;

  const clearAll = () =>
    onChange({ sort: filters.sort ?? "newest" });

  return (
    <div className="space-y-2.5">
      {/* Search row */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q ?? ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Search quotes, people, or context..."
          className="h-11 pl-9 pr-9"
          inputMode="search"
          enterKeyHint="search"
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, q: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scroll-hide">
        {/* Favorites toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, favorite: !filters.favorite })}
          className={cnFilterChip(filters.favorite)}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              filters.favorite && "fill-rose-500 text-rose-500"
            )}
          />
          Favorites
        </button>

        {/* Author filter */}
        <Select
          value={filters.author ?? "__all"}
          onValueChange={(v) =>
            onChange({ ...filters, author: v === "__all" ? "" : v })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] gap-1.5 rounded-full border bg-card px-3 text-xs font-medium shadow-sm">
            <SelectValue placeholder="Who" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All people</SelectItem>
            {authors.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag filter */}
        <Select
          value={filters.tag ?? "__all"}
          onValueChange={(v) =>
            onChange({ ...filters, tag: v === "__all" ? "" : v })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] gap-1.5 rounded-full border bg-card px-3 text-xs font-medium shadow-sm">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t} value={t}>
                #{t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sort ?? "newest"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              sort: v as QuoteFilters["sort"],
            })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-[7.5rem] gap-1.5 rounded-full border bg-card px-3 text-xs font-medium shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="rating">Funniest</SelectItem>
            <SelectItem value="favorite">Favorites</SelectItem>
            <SelectItem value="laughs">Most laughed</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {resultCount} {resultCount === 1 ? "quote" : "quotes"}
        </span>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 shrink-0 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Date range row */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground shrink-0">From</span>
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
          className="h-8 w-auto text-xs"
        />
        <span className="text-xs text-muted-foreground shrink-0">to</span>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
          className="h-8 w-auto text-xs"
        />
      </div>
    </div>
  );
}

function cnFilterChip(active: boolean) {
  const base =
    "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors";
  return active
    ? cn(base, "border-primary bg-primary text-primary-foreground")
    : cn(base, "bg-card text-foreground hover:bg-muted");
}
