"use client";

import { Lightbulb, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuggestions, useDeleteSuggestion } from "@/hooks/use-suggestions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function SuggestionsView() {
  const { data: suggestions, isLoading } = useSuggestions();
  const deleteSuggestion = useDeleteSuggestion();

  const onDelete = async (id: string) => {
    try {
      await deleteSuggestion.mutateAsync(id);
      toast.success("Suggestion deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = suggestions ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Lightbulb className="h-4 w-4 text-primary" />
        Suggestions ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No suggestions yet. When users submit feature ideas or bug reports,
          they&apos;ll show up here.
        </p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto scroll-slim">
          {items.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">{s.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.authorName} · {timeAgo(s.createdAt)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(s.id)}
                disabled={deleteSuggestion.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
