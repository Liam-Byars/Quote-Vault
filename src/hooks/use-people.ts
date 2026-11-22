"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { withTimeout } from "@/lib/utils";
import { fetchCloudPerson, saveCloudPerson } from "@/lib/firestore-data";
import { fetchLocalPerson, saveLocalPerson } from "@/lib/local-db";
import type { PersonInput } from "@/lib/person-types";

export function usePerson(name: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["person", name],
    enabled: !!name,
    queryFn: async () => {
      if (user) {
        try {
          return await withTimeout(fetchCloudPerson(user.uid, name!));
        } catch {
          return null;
        }
      }
      return await fetchLocalPerson(name!);
    },
  });
}

export function useSavePerson() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      input,
    }: {
      name: string;
      input: PersonInput;
    }) => {
      if (user) {
        await saveCloudPerson(user.uid, name, input);
      } else {
        await saveLocalPerson(name, input);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["person"] });
    },
  });
}
