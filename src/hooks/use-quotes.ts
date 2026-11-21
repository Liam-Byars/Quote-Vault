"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { parseAuthors, type Quote, type QuoteInput, type QuoteStats } from "@/lib/quote-types";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCloudSync } from "@/lib/cloud-sync";
import {
  createCloudQuote,
  updateCloudQuote,
  patchCloudQuote,
  deleteCloudQuote,
} from "@/lib/firestore-data";
import {
  fetchLocalQuotes,
  createLocalQuote,
  updateLocalQuote,
  patchLocalQuote,
  deleteLocalQuote,
} from "@/lib/local-db";

export const QUOTES_KEY = ["quotes"] as const;
export const STATS_KEY = ["quotes", "stats"] as const;

export type QuoteFilters = {
  q?: string;
  author?: string;
  tag?: string;
  favorite?: boolean;
  sort?: "newest" | "oldest" | "rating" | "favorite" | "laughs";
  groupId?: string;
  ungrouped?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

// Apply filters to an in-memory list (used by both the cloud and local paths,
// since both fetch the whole collection and filter client-side).
function applyFilters(quotes: Quote[], filters: QuoteFilters): Quote[] {
  let out = quotes;
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (x) =>
        x.text.toLowerCase().includes(q) ||
        x.author.toLowerCase().includes(q) ||
        (x.context ?? "").toLowerCase().includes(q)
    );
  }
  if (filters.author) {
    const a = filters.author.toLowerCase();
    out = out.filter((x) =>
      parseAuthors(x.author).some(
        (name) => name.toLowerCase().includes(a)
      )
    );
  }
  if (filters.tag) {
    const t = filters.tag.toLowerCase();
    out = out.filter((x) =>
      x.tags
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .some((s) => s === t)
    );
  }
  if (filters.favorite) out = out.filter((x) => x.favorite);
  if (filters.groupId) out = out.filter((x) => x.groupId === filters.groupId);
  if (filters.ungrouped) out = out.filter((x) => !x.groupId);
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).toISOString();
    out = out.filter((x) => (x.dateSaid ?? x.createdAt) >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo + "T23:59:59").toISOString();
    out = out.filter((x) => (x.dateSaid ?? x.createdAt) <= to);
  }

  const sort = filters.sort ?? "newest";
  out = [...out].sort((a, b) => {
    const aDate = a.dateSaid ?? "";
    const bDate = b.dateSaid ?? "";
    if (sort === "oldest") return aDate < bDate ? -1 : 1;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "favorite") return Number(b.favorite) - Number(a.favorite);
    if (sort === "laughs") {
      const al = typeof localStorage !== "undefined" ? parseInt(localStorage.getItem(`laugh-${a.id}`) || "0", 10) : 0;
      const bl = typeof localStorage !== "undefined" ? parseInt(localStorage.getItem(`laugh-${b.id}`) || "0", 10) : 0;
      return bl - al;
    }
    return bDate < aDate ? -1 : 1; // newest
  });
  return out;
}

function computeStats(quotes: Quote[]): QuoteStats {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const counts = new Map<string, number>();
  for (const q of quotes) {
    const authors = parseAuthors(q.author);
    if (authors.length === 0) {
      counts.set("Unknown", (counts.get("Unknown") ?? 0) + 1);
    } else {
      for (const author of authors) {
        counts.set(author, (counts.get(author) ?? 0) + 1);
      }
    }
  }
  const topAuthors = [...counts.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const avg = quotes.length
    ? Math.round((quotes.reduce((s, q) => s + q.rating, 0) / quotes.length) * 10) /
      10
    : 0;

  // Last 6 months of quote counts (by dateSaid or createdAt as fallback).
  const monthlyCounts: { label: string; count: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const count = quotes.filter((q) => {
      const date = q.dateSaid ?? q.createdAt;
      return date >= start && date < end;
    }).length;
    monthlyCounts.push({ label: monthNames[d.getMonth()], count });
  }

  return {
    total: quotes.length,
    favorites: quotes.filter((q) => q.favorite).length,
    thisMonth: quotes.filter((q) => (q.dateSaid ?? q.createdAt) >= monthStart).length,
    uniqueAuthors: counts.size,
    avgRating: avg,
    topAuthors,
    monthlyCounts,
  };
}

// The user's whole visible collection:
//   signed in + cloud OK  → personal quotes + every shared group quote (real-time)
//   signed in + cloud FAIL → local IndexedDB quotes (fallback so the app
//                            still works if Firestore rules aren't set yet)
//   signed out            → local IndexedDB quotes
function useAllQuotes() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();

  const cloudQuotes =
    uid && !cloud.error
      ? [
          ...cloud.personalQuotes,
          ...Object.values(cloud.groupQuotes).flat(),
        ]
      : [];
  // Fall back to local when: not signed in, cloud is erroring, OR cloud is
  // ready but empty (so quotes saved locally during a previous cloud failure
  // still show instead of vanishing behind an empty cloud state).
  const cloudIsEmpty =
    uid && !cloud.error && cloud.ready && cloudQuotes.length === 0;
  const useLocal = !uid || cloud.error || cloudIsEmpty;

  const local = useQuery<Quote[]>({
    queryKey: [...QUOTES_KEY, "local"],
    enabled: useLocal,
    queryFn: fetchLocalQuotes,
  });

  const quotes = useLocal ? local.data ?? [] : cloudQuotes;

  return {
    quotes,
    isLoading: useLocal ? local.isLoading : !cloud.ready,
  };
}

export function useQuotes(filters: QuoteFilters) {
  const { quotes, isLoading } = useAllQuotes();
  return {
    data: { quotes: applyFilters(quotes, filters) },
    isLoading,
  };
}

export function useQuoteStats() {
  const { quotes, isLoading } = useAllQuotes();
  return {
    data: { stats: computeStats(quotes) },
    isLoading,
  };
}

export function useCreateQuote() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteInput) => {
      if (user && !cloud.error) {
        try {
          return await withTimeout(createCloudQuote(user.uid, input));
        } catch (err) {
          // Cloud write failed (e.g. rules block creates). Don't lose the
          // quote — save locally and flag cloud as erroring so everything
          // switches to local mode.
          cloud.reportWriteError(err);
          return createLocalQuote(input);
        }
      }
      return createLocalQuote(input);
    },
    onSuccess: () => {
      // Cloud updates arrive via real-time listeners; local needs a refetch.
      qc.invalidateQueries({ queryKey: QUOTES_KEY });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateQuote() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      currentGroupId,
    }: {
      id: string;
      input: QuoteInput;
      currentGroupId?: string | null;
    }) => {
      if (user && !cloud.error) {
        try {
          return await withTimeout(updateCloudQuote({
            id,
            currentGroupId: currentGroupId ?? null,
            uid: user.uid,
            input,
          }));
        } catch (err) {
          cloud.reportWriteError(err);
          return updateLocalQuote(id, input);
        }
      }
      return updateLocalQuote(id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUOTES_KEY });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      favorite,
      groupId,
    }: {
      id: string;
      favorite: boolean;
      groupId?: string | null;
    }) => {
      if (user && !cloud.error) {
        try {
          await withTimeout(patchCloudQuote({ id, groupId: groupId ?? null, patch: { favorite } }));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
      }
      await patchLocalQuote(id, { favorite });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUOTES_KEY });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteQuote() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      groupId,
    }: {
      id: string;
      groupId?: string | null;
    }) => {
      if (user && !cloud.error) {
        try {
          await withTimeout(deleteCloudQuote({ id, groupId: groupId ?? null }));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
      }
      await deleteLocalQuote(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUOTES_KEY });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
