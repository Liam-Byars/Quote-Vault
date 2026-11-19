"use client";

import { MessageSquareQuote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
};

export function EmptyState({ hasFilters, onAdd, onClear }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <MessageSquareQuote className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        {hasFilters ? "No quotes match" : "Your vault is empty"}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different search or clear your filters to see everything."
          : "Start saving the funny, weird, and unforgettable things people say."}
      </p>
      <div className="mt-5 flex gap-2">
        {hasFilters ? (
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button onClick={onAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add your first quote
          </Button>
        )}
      </div>
    </div>
  );
}
