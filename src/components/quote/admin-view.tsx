"use client";

import { useState, useEffect } from "react";
import { Shield, Trash2, Loader2 } from "lucide-react";
import { collection, onSnapshot, query, type Unsubscribe } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { mapQuoteDoc } from "@/lib/firestore-data";
import { deleteCloudQuote } from "@/lib/firestore-data";
import type { Quote } from "@/lib/quote-types";
import { authorColor, initials } from "@/lib/quote-types";

export function AdminView() {
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const unsub: Unsubscribe = onSnapshot(
      collection(db, "quotes"),
      (snap) => {
        setAllQuotes(
          snap.docs.map((d) =>
            mapQuoteDoc(d.id, d.data() as Record<string, unknown>)
          )
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const onDelete = async (q: Quote) => {
    setDeleting(q.id);
    try {
      await deleteCloudQuote({ id: q.id, groupId: null });
      toast.success("Quote deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Shield className="h-4 w-4 text-primary" />
        Admin · All quotes ({allQuotes.length})
      </div>
      {allQuotes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No quotes in the database yet.
        </p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto scroll-slim">
          {allQuotes.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${authorColor(q.author || "Unknown")}`}
              >
                {initials(q.author || "Unknown")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">
                  &ldquo;{q.text}&rdquo;
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {q.author || "Unknown"} · {q.rating}★
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(q)}
                disabled={deleting === q.id}
              >
                {deleting === q.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
