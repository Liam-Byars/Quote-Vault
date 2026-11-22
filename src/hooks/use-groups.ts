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
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCloudSync } from "@/lib/cloud-sync";
import {
  createCloudGroup,
  updateCloudGroup,
  deleteCloudGroup,
  addCloudNamedMember,
  removeCloudMember,
  updateCloudMemberName,
  joinCloudGroupByCode,
} from "@/lib/firestore-data";
import {
  fetchLocalGroups,
  fetchLocalGroup,
  createLocalGroup,
  updateLocalGroup,
  deleteLocalGroup,
  addLocalMember,
  updateLocalMemberName,
  removeLocalMember,
  joinLocalGroup,
} from "@/lib/local-db";

export const GROUPS_KEY = ["groups"] as const;

type GroupDetail = GroupWithDetails & { quotes: Quote[] };

export function useGroups() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();
  const cloudGroups = uid && !cloud.error ? cloud.groups : [];
  const cloudIsEmpty = uid && !cloud.error && cloud.ready && cloudGroups.length === 0;
  const useLocal = !uid || cloud.error || cloudIsEmpty;

  const local = useQuery<GroupWithDetails[]>({
    queryKey: [...GROUPS_KEY, "local"],
    enabled: useLocal,
    queryFn: fetchLocalGroups,
  });

  const groups = useLocal ? (local.data ?? []) : cloudGroups;
  return {
    data: { groups },
    isLoading: useLocal ? local.isLoading : !cloud.ready,
  };
}

export function useGroup(id: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const cloud = useCloudSync();
  const cloudGroup = uid && !cloud.error ? (cloud.groups.find((g) => g.id === id) ?? null) : null;
  const cloudIsEmpty = uid && !cloud.error && cloud.ready && cloud.groups.length === 0;
  const useLocal = !uid || cloud.error || cloudIsEmpty;

  const local = useQuery<GroupDetail | null>({
    queryKey: [...GROUPS_KEY, "detail", id, "local"],
    enabled: useLocal && !!id,
    queryFn: () => fetchLocalGroup(id as string),
  });

  if (!useLocal) {
    const detail: GroupDetail | null = cloudGroup
      ? { ...cloudGroup, quotes: cloud.groupQuotes[id as string] ?? [] }
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
        try {
          const g = await withTimeout(createCloudGroup(user.uid, input));
          return { group: { id: g.id, name: g.name } };
        } catch (err) {
          cloud.reportWriteError(err);
        }
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
        try {
          await withTimeout(updateCloudGroup(id, input));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
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
        try {
          await withTimeout(deleteCloudGroup(id));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
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
        try {
          await withTimeout(addCloudNamedMember(groupId, input));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
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
        try {
          await withTimeout(removeCloudMember({
            groupId,
            memberId,
            named: Boolean(named),
          }));
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
      }
      await removeLocalMember(groupId, memberId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}

export function useUpdateMemberName() {
  const { user } = useAuth();
  const cloud = useCloudSync();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      memberId,
      name,
      named,
    }: {
      groupId: string;
      memberId: string;
      name: string;
      named: boolean;
    }) => {
      if (user && !cloud.error) {
        try {
          await withTimeout(
            updateCloudMemberName({ groupId, memberId, named, name })
          );
          return;
        } catch (err) {
          cloud.reportWriteError(err);
        }
      }
      await updateLocalMemberName(groupId, memberId, name);
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
      // For joins, always try cloud first if signed in — don't let a
      // stale cloud.error from initialization block the join. The join
      // is a one-time Firestore query, not a continuous listener, so
      // it works even if onSnapshot had a transient error earlier.
      if (user) {
        try {
          return await withTimeout(joinCloudGroupByCode(user.uid, inviteCode, name, email));
        } catch (err) {
          cloud.reportWriteError(err);
        }
      }
      return await joinLocalGroup(inviteCode, name, email);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "local"] });
    },
  });
}
