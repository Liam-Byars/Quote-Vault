"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
};

// Funny-meter star rating. Interactive when `onChange` is provided.
export function StarRating({ value, onChange, size = 18, className }: Props) {
  const interactive = typeof onChange === "function";
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : undefined}
      aria-label="Funny meter"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const btn = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              filled
                ? "fill-amber-400 text-amber-500"
                : "fill-transparent text-muted-foreground/40"
            )}
          />
        );
        if (!interactive) return <span key={star}>{btn}</span>;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
}
