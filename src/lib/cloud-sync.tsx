"use client";

// CloudSync — real-time data for signed-in users.
//
// Subscribes (onSnapshot) to everything the signed-in user can see:
//   • their personal quotes        (quotes where uid == me)
//   • their group memberships      (users/{uid}/groupMemberships)
//   • for each group: the group doc, its members, and its shared quotes
//
// Every listener pushes straight into React state, so when anyone in a group
// adds a quote, every member sees it within seconds — no refresh needed.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { describeCloudError } from "@/lib/cloud-errors";
import {
  mapGroupDoc,
  mapMemberDoc,
  mapQuoteDoc,
  migrateOwnedGroups,
} from "@/lib/firestore-data";
import type { Quote } from "@/lib/quote-types";
import type { Group, GroupMember, GroupWithDetails } from "@/lib/group-types";

type CloudState = {
  /** true once the first snapshot of personal quotes + memberships arrived */
  ready: boolean;
  /** true when Firestore is unreachable (e.g. rules not set). When this is
   *  set, `ready` is also set so the UI doesn't hang — hooks fall back to
   *  local IndexedDB data via `useCloudSync().error`. */
  error: boolean;
  personalQuotes: Quote[];
  groups: GroupWithDetails[];
  /** groupId -> shared quotes in that group (real-time) */
  groupQuotes: Record<string, Quote[]>;
  /** Called by mutation hooks when a cloud WRITE fails. Sets `error` so the
   *  app falls back to local IndexedDB for everything (reads + writes)
   *  until the page is refreshed. */
  reportWriteError: (err: unknown) => void;
};

const EMPTY: CloudState = {
  ready: false,
  error: false,
  personalQuotes: [],
  groups: [],
  groupQuotes: {},
  reportWriteError: () => {},
};

const CloudSyncContext = createContext<CloudState>(EMPTY);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [personalQuotes, setPersonalQuotes] = useState<Quote[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupDocs, setGroupDocs] = useState<Record<string, Group>>({});
  const [groupMembers, setGroupMembers] = useState<
    Record<string, GroupMember[]>
  >({});
  const [groupQuotes, setGroupQuotes] = useState<Record<string, Quote[]>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const erroredRef = useRef(false);
  const reportError = useCallback((err: unknown) => {
    console.error("[cloud-sync]", err);
    // Mark ready so the UI stops showing a loading spinner and can fall
    // back to local IndexedDB data. Without this, a permission-denied
    // error (e.g. Firestore rules not yet pasted) hangs the app forever.
    setReady(true);
    setError(true);
    if (!erroredRef.current) {
      erroredRef.current = true;
      toast.error(describeCloudError(err), { duration: 8000 });
    }
  }, []);

  // Called by mutation hooks when a cloud WRITE fails (but reads may still
  // succeed — e.g. rules allow reads but block creates). Sets `error` so the
  // app immediately falls back to local IndexedDB for everything.
  const reportWriteError = useCallback((err: unknown) => {
    console.error("[cloud-sync] write error:", err);
    setError(true);
    if (!erroredRef.current) {
      erroredRef.current = true;
      toast.error(describeCloudError(err) + " — saving locally instead.", {
        duration: 8000,
      });
    }
  }, []);

  // NOTE: this provider is remounted (via `key`) whenever the signed-in user
  // changes, so all state resets automatically on sign-in/out — no reset
  // effect needed.

  // Level 1: personal quotes + group memberships.
  useEffect(() => {
    if (!uid || !db) return;
    const unsubs: Unsubscribe[] = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, "quotes"), where("uid", "==", uid)),
        (snap) => {
          setPersonalQuotes(
            snap.docs.map((d) => mapQuoteDoc(d.id, d.data() as Record<string, unknown>))
          );
          setReady((r) => r || true);
        },
        reportError
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "users", uid, "groupMemberships"),
        (snap) => {
          setGroupIds(snap.docs.map((d) => d.id));
          setReady((r) => r || true);
          // Self-heal groups created before the shared-groups update so they
          // show up in the list (additive only).
          migrateOwnedGroups(uid).catch((e) => console.warn(e));
        },
        reportError
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [uid, reportError]);

  // Level 2: per-group listeners (doc + members + quotes), subscribed whenever
  // the set of group ids changes.
  useEffect(() => {
    if (!uid || !db) return;
    const unsubs: Unsubscribe[] = [];
    const ids = groupIds;

    for (const gid of ids) {
      // Group doc (name/description/invite code — owner edits are live too).
      unsubs.push(
        onSnapshot(
          doc(db, "groups", gid),
          (snap) => {
            if (!snap.exists()) return; // deleted — membership listener will clean up
            setGroupDocs((prev) => ({
              ...prev,
              [gid]: mapGroupDoc(gid, snap.data() as Record<string, unknown>),
            }));
          },
          reportError
        )
      );

      // Joined members (real-time: someone joins via QR → appears instantly).
      unsubs.push(
        onSnapshot(
          collection(db, "groups", gid, "members"),
          (snap) => {
            setGroupMembers((prev) => ({
              ...prev,
              [gid]: snap.docs.map((d) =>
                mapMemberDoc(d.id, gid, d.data() as Record<string, unknown>)
              ),
            }));
          },
          reportError
        )
      );

      // Shared quotes (THE real-time feature: members see new quotes in seconds).
      unsubs.push(
        onSnapshot(
          collection(db, "groups", gid, "quotes"),
          (snap) => {
            setGroupQuotes((prev) => ({
              ...prev,
              [gid]: snap.docs.map((d) =>
                mapQuoteDoc(d.id, d.data() as Record<string, unknown>, gid)
              ),
            }));
          },
          reportError
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [uid, groupIds, reportError]);

  // Derive the final groups list (doc + joined members + named members +
  // live quote counts).
  const groups = useMemo<GroupWithDetails[]>(() => {
    const out: GroupWithDetails[] = [];
    for (const gid of groupIds) {
      const g = groupDocs[gid];
      if (!g) continue;
      const joined = groupMembers[gid] ?? [];
      const named = (g as Group & { namedMembers?: GroupMember[] })
        .namedMembers ?? [];
      // Merge: joined members (with uid) + named members (invite-by-name),
      // skipping named duplicates of joined people (same name).
      const joinedNames = new Set(joined.map((m) => m.name.toLowerCase()));
      const members = [
        ...joined,
        ...named.filter((m) => !joinedNames.has(m.name.toLowerCase())),
      ];
      out.push({
        id: g.id,
        name: g.name,
        description: g.description,
        inviteCode: g.inviteCode,
        ownerName: g.ownerName,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        members,
        quoteCount: (groupQuotes[gid] ?? []).length,
      });
    }
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out;
  }, [groupIds, groupDocs, groupMembers, groupQuotes]);

  const value = useMemo<CloudState>(
    () => ({ ready, error, personalQuotes, groups, groupQuotes, reportWriteError }),
    [ready, error, personalQuotes, groups, groupQuotes, reportWriteError]
  );

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync(): CloudState {
  return useContext(CloudSyncContext);
}
