"use client";

// Firestore data layer for the authenticated (signed-in) path.
//
// Data model (real-time, shared groups):
//   quotes/{qid}                          — personal quotes (owner-only)
//   groups/{gid}                          — group doc (+ named members array)
//   groups/{gid}/members/{uid}            — joined members (self-join, real)
//   groups/{gid}/quotes/{qid}             — shared group quotes (members)
//   users/{uid}/groupMemberships/{gid}    — pointer so you can list your groups
//
// Reads happen through onSnapshot listeners in cloud-sync.tsx (real-time);
// this file holds the writes + shared mappers.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Quote, QuoteInput, VoiceFont } from "./quote-types";
import type {
  Group,
  GroupInput,
  GroupMember,
  GroupWithDetails,
  MemberInput,
} from "./group-types";

function requireDb() {
  if (!db) throw new Error("Firestore is not initialized");
  return db;
}

// ── Mappers ────────────────────────────────────────────────────────────────

export function mapQuoteDoc(
  id: string,
  data: Record<string, unknown>,
  groupIdOverride?: string | null
): Quote {
  return {
    id,
    text: String(data.text ?? ""),
    author: String(data.author ?? ""),
    dateSaid: (data.dateSaid as string | null) ?? null,
    context: (data.context as string) ?? null,
    tags: String(data.tags ?? ""),
    rating: Number(data.rating ?? 3),
    favorite: Boolean(data.favorite),
    // Group quotes derive their groupId from the subcollection they live in.
    groupId:
      groupIdOverride !== undefined
        ? groupIdOverride
        : ((data.groupId as string) ?? null),
    voiceFont: (data.voiceFont as VoiceFont) ?? "normal",
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export function mapMemberDoc(
  uid: string,
  groupId: string,
  data: Record<string, unknown>
): GroupMember {
  return {
    id: uid,
    groupId,
    name: String(data.name ?? "Someone"),
    email: (data.email as string) ?? null,
    role: String(data.role ?? "member"),
    joinedAt: String(data.joinedAt ?? new Date().toISOString()),
  };
}

export function mapGroupDoc(
  id: string,
  data: Record<string, unknown>
): Group & { namedMembers: GroupMember[] } {
  const named = Array.isArray(data.members)
    ? (data.members as Array<Record<string, unknown>>).map((m, i) => ({
        id: String(m.id ?? `named-${i}`),
        groupId: id,
        name: String(m.name ?? ""),
        email: (m.email as string) ?? null,
        role: String(m.role ?? "member"),
        joinedAt: String(m.joinedAt ?? new Date().toISOString()),
      }))
    : [];
  return {
    id,
    name: String(data.name ?? "Untitled"),
    description: (data.description as string) ?? null,
    inviteCode: String(data.inviteCode ?? ""),
    ownerName: String(data.ownerName ?? "you"),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    namedMembers: named,
  };
}

function quotePayload(uid: string, input: QuoteInput) {
  const now = new Date().toISOString();
  return {
    uid,
    text: input.text.trim(),
    author: input.author.trim(),
    dateSaid: input.dateSaid,
    context: input.context ?? null,
    tags: input.tags ?? "",
    rating: input.rating ?? 3,
    favorite: Boolean(input.favorite),
    groupId: input.groupId ?? null,
    voiceFont: input.voiceFont ?? "normal",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Quotes ─────────────────────────────────────────────────────────────────

export async function createCloudQuote(
  uid: string,
  input: QuoteInput
): Promise<Quote> {
  const firestore = requireDb();
  const payload = quotePayload(uid, input);

  if (input.groupId) {
    // Shared group quote — every member sees it in real time.
    const ref = await addDoc(
      collection(firestore, "groups", input.groupId, "quotes"),
      payload
    );
    return mapQuoteDoc(ref.id, payload, input.groupId);
  }
  // Personal quote.
  const ref = await addDoc(collection(firestore, "quotes"), payload);
  return mapQuoteDoc(ref.id, payload);
}

export async function updateCloudQuote(args: {
  id: string;
  currentGroupId: string | null; // where the quote lives now
  uid: string;
  input: QuoteInput;
}): Promise<Quote> {
  const firestore = requireDb();
  const { id, currentGroupId, uid, input } = args;
  const now = new Date().toISOString();
  const payload = {
    uid,
    text: input.text.trim(),
    author: input.author.trim(),
    dateSaid: input.dateSaid,
    context: input.context ?? null,
    tags: input.tags ?? "",
    rating: input.rating ?? 3,
    favorite: Boolean(input.favorite),
    groupId: input.groupId ?? null,
    voiceFont: input.voiceFont ?? "normal",
    createdAt: now, // setDoc replaces the doc; createdAt is refreshed (best effort)
    updatedAt: now,
  };
  const targetGid = input.groupId ?? null;

  if (currentGroupId === targetGid) {
    // Same location — update in place.
    const ref = currentGroupId
      ? doc(firestore, "groups", currentGroupId, "quotes", id)
      : doc(firestore, "quotes", id);
    await setDoc(ref, payload, { merge: true });
    return mapQuoteDoc(id, payload, targetGid ?? undefined);
  }

  // Moved (personal ↔ group, or group → group): write to the new location,
  // then delete the old copy.
  const newRef = targetGid
    ? doc(firestore, "groups", targetGid, "quotes", id)
    : doc(firestore, "quotes", id);
  await setDoc(newRef, payload);
  const oldRef = currentGroupId
    ? doc(firestore, "groups", currentGroupId, "quotes", id)
    : doc(firestore, "quotes", id);
  await deleteDoc(oldRef);
  return mapQuoteDoc(id, payload, targetGid ?? undefined);
}

export async function patchCloudQuote(args: {
  id: string;
  groupId: string | null; // where the quote lives
  patch: Partial<QuoteInput>;
}): Promise<void> {
  const firestore = requireDb();
  const { id, groupId, patch } = args;
  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.favorite !== undefined) data.favorite = patch.favorite;
  if (patch.rating !== undefined) data.rating = patch.rating;
  if (patch.text !== undefined) data.text = patch.text.trim();
  if (patch.author !== undefined) data.author = patch.author.trim();
  if (patch.tags !== undefined) data.tags = patch.tags;
  if (patch.context !== undefined)
    data.context = patch.context ? patch.context.trim() : null;
  if (patch.groupId !== undefined) data.groupId = patch.groupId ?? null;
  if (patch.dateSaid !== undefined) data.dateSaid = patch.dateSaid;

  const ref = groupId
    ? doc(firestore, "groups", groupId, "quotes", id)
    : doc(firestore, "quotes", id);
  await updateDoc(ref, data);
}

export async function deleteCloudQuote(args: {
  id: string;
  groupId: string | null;
}): Promise<void> {
  const firestore = requireDb();
  const { id, groupId } = args;
  const ref = groupId
    ? doc(firestore, "groups", groupId, "quotes", id)
    : doc(firestore, "quotes", id);
  await deleteDoc(ref);
}

// ── Groups ─────────────────────────────────────────────────────────────────

function genInviteCode(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function createCloudGroup(
  uid: string,
  input: GroupInput
): Promise<Group> {
  const firestore = requireDb();
  const now = new Date().toISOString();
  const ownerName = input.ownerName?.trim() || "you";

  // One batch: group doc + owner membership + owner's pointer.
  const gRef = doc(collection(firestore, "groups"));
  const batch = writeBatch(firestore);
  batch.set(gRef, {
    ownerUid: uid,
    ownerName,
    name: input.name.trim(),
    description: input.description ?? null,
    inviteCode: genInviteCode(),
    members: [], // named (invited-by-name) members; real members live in the
    // members subcollection keyed by uid
    createdAt: now,
    updatedAt: now,
  });
  batch.set(doc(firestore, "groups", gRef.id, "members", uid), {
    name: ownerName,
    email: null,
    role: "owner",
    joinedAt: now,
  });
  batch.set(doc(firestore, "users", uid, "groupMemberships", gRef.id), {
    joinedAt: now,
  });
  await batch.commit();

  return {
    id: gRef.id,
    name: input.name.trim(),
    description: input.description ?? null,
    inviteCode: "",
    ownerName,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCloudGroup(
  id: string,
  input: Partial<GroupInput>
): Promise<void> {
  const firestore = requireDb();
  const data: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined)
    data.description = input.description ? input.description.trim() : null;
  await updateDoc(doc(firestore, "groups", id), data);
}

export async function deleteCloudGroup(id: string): Promise<void> {
  const firestore = requireDb();
  const gRef = doc(firestore, "groups", id);

  // Collect member uids so we can clean their membership pointers too.
  const membersSnap = await getDocs(
    collection(firestore, "groups", id, "members")
  );
  const memberUids = membersSnap.docs.map((d) => d.id);

  // Also remove the group's shared quotes so nothing is orphaned.
  const quotesSnap = await getDocs(
    collection(firestore, "groups", id, "quotes")
  );

  const batch = writeBatch(firestore);
  batch.delete(gRef);
  for (const m of membersSnap.docs) {
    batch.delete(doc(firestore, "groups", id, "members", m.id));
  }
  for (const q of quotesSnap.docs) {
    batch.delete(doc(firestore, "groups", id, "quotes", q.id));
  }
  for (const mUid of memberUids) {
    batch.delete(doc(firestore, "users", mUid, "groupMemberships", id));
  }
  await batch.commit();
}

// Owner adds a named (not-yet-joined) member to the group doc's array.
export async function addCloudNamedMember(
  groupId: string,
  input: MemberInput
): Promise<void> {
  const firestore = requireDb();
  const gRef = doc(firestore, "groups", groupId);
  const gSnap = await getDoc(gRef);
  if (!gSnap.exists()) throw new Error("Group not found");
  const data = gSnap.data();
  const named = Array.isArray(data.members)
    ? (data.members as Array<Record<string, unknown>>)
    : [];
  const name = input.name.trim();
  if (named.some((m) => String(m.name ?? "") === name)) {
    throw new Error("A member with that name already exists in this group");
  }
  named.push({
    id: "named-" + Math.random().toString(36).slice(2, 10),
    name,
    email: input.email ?? null,
    role: "member",
    joinedAt: new Date().toISOString(),
  });
  await updateDoc(gRef, {
    members: named,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateCloudMemberName(args: {
  groupId: string;
  memberId: string;
  named: boolean;
  name: string;
}): Promise<void> {
  const firestore = requireDb();
  const { groupId, memberId, named, name } = args;

  if (named) {
    const gRef = doc(firestore, "groups", groupId);
    const gSnap = await getDoc(gRef);
    if (!gSnap.exists()) throw new Error("Group not found");
    const data = gSnap.data();
    const members = Array.isArray(data.members)
      ? [...(data.members as Array<Record<string, unknown>>)]
      : [];
    const idx = members.findIndex((m) => String(m.id ?? "") === memberId);
    if (idx === -1) throw new Error("Member not found");
    members[idx] = { ...members[idx], name };
    await updateDoc(gRef, {
      members,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  await updateDoc(doc(firestore, "groups", groupId, "members", memberId), {
    name,
  });
}

export async function removeCloudMember(args: {
  groupId: string;
  memberId: string;
  named: boolean; // named (array) vs joined (members/{uid} doc)
}): Promise<void> {
  const firestore = requireDb();
  const { groupId, memberId, named } = args;

  if (named) {
    // Remove from the group doc's members array (owner action).
    const gRef = doc(firestore, "groups", groupId);
    const gSnap = await getDoc(gRef);
    if (!gSnap.exists()) throw new Error("Group not found");
    const data = gSnap.data();
    const arr = Array.isArray(data.members)
      ? (data.members as Array<Record<string, unknown>>)
      : [];
    const next = arr.filter((m) => String(m.id ?? "") !== memberId);
    await updateDoc(gRef, {
      members: next,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  // Joined member: delete their member doc + their membership pointer.
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, "groups", groupId, "members", memberId));
  batch.delete(doc(firestore, "users", memberId, "groupMemberships", groupId));
  await batch.commit();
}

export async function joinCloudGroupByCode(
  uid: string,
  inviteCodeStr: string,
  name: string,
  email?: string
): Promise<{
  group: { id: string; name: string };
  alreadyMember: boolean;
}> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, "groups"),
    where("inviteCode", "==", inviteCodeStr.trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid invite code");
  const gdoc = snap.docs[0];
  const data = gdoc.data();

  // Already joined?
  const memberSnap = await getDoc(
    doc(firestore, "groups", gdoc.id, "members", uid)
  );
  if (memberSnap.exists()) {
    return {
      group: { id: gdoc.id, name: String(data.name ?? "Group") },
      alreadyMember: true,
    };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, "groups", gdoc.id, "members", uid), {
    name: name.trim(),
    email: email ?? null,
    role: "member",
    joinedAt: now,
  });
  batch.set(doc(firestore, "users", uid, "groupMemberships", gdoc.id), {
    joinedAt: now,
  });
  await batch.commit();

  return {
    group: { id: gdoc.id, name: String(data.name ?? "Group") },
    alreadyMember: false,
  };
}

// ── Migration / self-heal ──────────────────────────────────────────────────

// Groups created before the shared-groups update stored ownership on the
// group doc but had no membership pointer. On first load, make sure every
// group you own has your pointer + owner member doc so it shows up in your
// groups list. (Additive only — nothing is deleted.)
export async function migrateOwnedGroups(uid: string): Promise<void> {
  const firestore = requireDb();
  const owned = await getDocs(
    query(collection(firestore, "groups"), where("ownerUid", "==", uid))
  );
  for (const g of owned.docs) {
    const pointerRef = doc(firestore, "users", uid, "groupMemberships", g.id);
    const pointer = await getDoc(pointerRef);
    const memberRef = doc(firestore, "groups", g.id, "members", uid);
    const member = await getDoc(memberRef);

    if (pointer.exists() && member.exists()) continue;

    const now = new Date().toISOString();
    const data = g.data();
    const batch = writeBatch(firestore);
    if (!pointer.exists()) {
      batch.set(pointerRef, { joinedAt: now });
    }
    if (!member.exists()) {
      batch.set(memberRef, {
        name: String(data.ownerName ?? "owner"),
        email: null,
        role: "owner",
        joinedAt: now,
      });
    }
    await batch.commit();
  }
}

// Re-exported types used by cloud-sync.
export type { GroupWithDetails };
