"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { withTimeout } from "@/lib/utils";
import {
  createCloudSuggestion,
  fetchCloudSuggestions,
  deleteCloudSuggestion,
} from "@/lib/firestore-data";

export function useSuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["suggestions"],
    enabled: !!user,
    queryFn: async () => {
      try {
        return await withTimeout(fetchCloudSuggestions());
      } catch {
        return [];
      }
    },
  });
}

export function useCreateSuggestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      text,
      authorName,
    }: {
      text: string;
      authorName: string;
    }) => {
      if (!user) throw new Error("Sign in to submit a suggestion");
      await withTimeout(createCloudSuggestion(user.uid, text, authorName));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useDeleteSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await withTimeout(deleteCloudSuggestion(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}
