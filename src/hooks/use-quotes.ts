"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Quote, QuoteInput, QuoteStats } from "@/lib/quote-types";
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
  sort?: "newest" | "oldest" | "rating" | "favorite";
  groupId?: string;
  ungrouped?: boolean;
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
    out = out.filter((x) => x.author.toLowerCase().includes(a));
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

  const sort = filters.sort ?? "newest";
  out = [...out].sort((a, b) => {
    if (sort === "oldest") return a.dateSaid < b.dateSaid ? -1 : 1;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "favorite") return Number(b.favorite) - Number(a.favorite);
    return b.dateSaid < a.dateSaid ? -1 : 1; // newest
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
    const key = q.author.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topAuthors = [...counts.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const avg = quotes.length
    ? Math.round((quotes.reduce((s, q) => s + q.rating, 0) / quotes.length) * 10) /
      10
    : 0;
  return {
    total: quotes.length,
    favorites: quotes.filter((q) => q.favorite).length,
    thisMonth: quotes.filter((q) => q.dateSaid >= monthStart).length,
    uniqueAuthors: counts.size,
    avgRating: avg,
    topAuthors,
  };
}

// The user's whole visible collection:
//   signed in  → personal quotes + every shared group quote (real-time)
//   signed out → local IndexedDB quotes
function useAllQuotes() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();

  const local = useQuery<Quote[]>({
    queryKey: [...QUOTES_KEY, "local"],
    enabled: !uid,
    queryFn: fetchLocalQuotes,
  });

  const quotes = uid
    ? [
        ...cloud.personalQuotes,
        ...Object.values(cloud.groupQuotes).flat(),
      ]
    : (local.data ?? []);

  return {
    quotes,
    isLoading: uid ? !cloud.ready : local.isLoading,
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteInput) => {
      if (user) return createCloudQuote(user.uid, input);
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
      if (user) {
        return updateCloudQuote({
          id,
          currentGroupId: currentGroupId ?? null,
          uid: user.uid,
          input,
        });
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
      if (user) {
        await patchCloudQuote({ id, groupId: groupId ?? null, patch: { favorite } });
        return;
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      groupId,
    }: {
      id: string;
      groupId?: string | null;
    }) => {
      if (user) {
        await deleteCloudQuote({ id, groupId: groupId ?? null });
        return;
      }
      await deleteLocalQuote(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUOTES_KEY });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
