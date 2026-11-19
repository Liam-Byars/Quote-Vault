"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  GroupInput,
  GroupWithDetails,
  MemberInput,
} from "@/lib/group-types";
import type { Quote } from "@/lib/quote-types";
import { useAuth } from "@/hooks/use-auth";
import { useCloudSync } from "@/lib/cloud-sync";
import {
  createCloudGroup,
  updateCloudGroup,
  deleteCloudGroup,
  addCloudNamedMember,
  removeCloudMember,
  joinCloudGroupByCode,
} from "@/lib/firestore-data";
import {
  fetchLocalGroups,
  fetchLocalGroup,
  createLocalGroup,
  updateLocalGroup,
  deleteLocalGroup,
  addLocalMember,
  removeLocalMember,
  joinLocalGroup,
} from "@/lib/local-db";

export const GROUPS_KEY = ["groups"] as const;

type GroupDetail = GroupWithDetails & { quotes: Quote[] };

export function useGroups() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();
  const useLocal = !uid || cloud.error;

  const local = useQuery<GroupWithDetails[]>({
    queryKey: [...GROUPS_KEY, "local"],
    enabled: useLocal,
    queryFn: fetchLocalGroups,
  });

  const groups = useLocal ? (local.data ?? []) : cloud.groups;
  return {
    data: { groups },
    isLoading: useLocal ? local.isLoading : !cloud.ready,
  };
}

export function useGroup(id: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();
  const useLocal = !uid || cloud.error;

  const local = useQuery<GroupDetail | null>({
    queryKey: [...GROUPS_KEY, "detail", id, "local"],
    enabled: useLocal && !!id,
    queryFn: () => fetchLocalGroup(id as string),
  });

  if (!useLocal) {
    const group = cloud.groups.find((g) => g.id === id) ?? null;
    const detail: GroupDetail | null = group
      ? { ...group, quotes: cloud.groupQuotes[id as string] ?? [] }
      : null;
    return { data: detail ? { group: detail } : undefined, isLoading: !cloud.ready };
  }

  return {
    data: local.data ? { group: local.data } : undefined,
    isLoading: local.isLoading,
  };
}

export function useCreateGroup() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GroupInput): Promise<{
      group: { id: string; name: string };
    }> => {
      // Normalize both paths to the same shape the dialogs expect
      // ({ group: { id, name } }) — matches useJoinGroup's return.
      if (user && !cloud.error) {
        const g = await createCloudGroup(user.uid, input);
        return { group: { id: g.id, name: g.name } };
      }
      const g = await createLocalGroup(input);
      return { group: { id: g.id, name: g.name } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}

export function useUpdateGroup() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<GroupInput>;
    }) => {
      if (user && !cloud.error) {
        await updateCloudGroup(id, input);
        return;
      }
      await updateLocalGroup(id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}

export function useDeleteGroup() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (user && !cloud.error) {
        await deleteCloudGroup(id);
        return;
      }
      await deleteLocalGroup(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
      qc.invalidateQueries({ queryKey: ["quotes", "local"] });
    },
  });
}

export function useAddMember() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      input,
    }: {
      groupId: string;
      input: MemberInput;
    }) => {
      if (user && !cloud.error) {
        await addCloudNamedMember(groupId, input);
        return;
      }
      await addLocalMember(groupId, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}

export function useRemoveMember() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      memberId,
      named,
    }: {
      groupId: string;
      memberId: string;
      // named = invited-by-name (stored on the group doc);
      // not named = a real joined member (members/{uid} doc)
      named?: boolean;
    }) => {
      if (user && !cloud.error) {
        await removeCloudMember({
          groupId,
          memberId,
          named: Boolean(named),
        });
        return;
      }
      await removeLocalMember(groupId, memberId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}

export function useJoinGroup() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inviteCode,
      name,
      email,
    }: {
      inviteCode: string;
      name: string;
      email?: string;
    }) => {
      if (user && !cloud.error) {
        return await joinCloudGroupByCode(user.uid, inviteCode, name, email);
      }
      return await joinLocalGroup(inviteCode, name, email);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}
