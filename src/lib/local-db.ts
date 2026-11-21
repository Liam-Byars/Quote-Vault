"use client";

// In-browser local data layer (IndexedDB) — the not-signed-in counterpart to
// the Firestore layer. Mirrors the same shapes so the hooks can swap between
// them transparently. This makes the app fully client-side and statically
// deployable (no server/API routes needed).

import { openDB, type IDBPDatabase } from "idb";
import type { Quote, QuoteInput } from "./quote-types";
import type {
  Group,
  GroupInput,
  GroupMember,
  GroupWithDetails,
  MemberInput,
} from "./group-types";

type GroupDoc = Group & { members: GroupMember[] };

const DB_NAME = "quote-vault";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("quotes")) {
          db.createObjectStore("quotes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("groups")) {
          db.createObjectStore("groups", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function inviteCode(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

// ── Seeding ────────────────────────────────────────────────────────────────

let seeded = false;
let seedPromise: Promise<void> | null = null;

// Seed sample data on first use. Uses a shared promise so concurrent callers
// (quotes list, groups list, stats all fire on load) don't triple-seed.
function ensureSeeded(): Promise<void> {
  if (seeded) return Promise.resolve();
  if (seedPromise) return seedPromise;
  seedPromise = runSeed();
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const db = await getDB();
  const count = await db.count("quotes");
  if (count > 0) {
    seeded = true;
    return;
  }

  const now = Date.now();
  const samples: Quote[] = [
    {
      id: uid(),
      text: "I'm not arguing, I'm just explaining why I'm right.",
      author: "Dad",
      dateSaid: new Date(Date.UTC(2025, 5, 14)).toISOString(),
      context: "During a debate about how to load the dishwasher",
      tags: "dad-jokes, classic",
      rating: 4,
      favorite: true,
      groupId: null,
      createdAt: new Date(now - 60000).toISOString(),
      updatedAt: new Date(now - 60000).toISOString(),
    },
    {
      id: uid(),
      text: "Why walk when you can be carried? That's my whole philosophy.",
      author: "Mia (age 4)",
      dateSaid: new Date(Date.UTC(2025, 6, 2)).toISOString(),
      context: "Refusing to walk from the car to the front door",
      tags: "kids, relatable",
      rating: 5,
      favorite: true,
      groupId: null,
      createdAt: new Date(now - 50000).toISOString(),
      updatedAt: new Date(now - 50000).toISOString(),
    },
    {
      id: uid(),
      text: "I put the 'pro' in procrastinate. Eventually.",
      author: "Alex",
      dateSaid: new Date(Date.UTC(2025, 4, 20)).toISOString(),
      context: "Office Slack, #random channel",
      tags: "work, self-aware",
      rating: 3,
      favorite: false,
      groupId: null,
      createdAt: new Date(now - 40000).toISOString(),
      updatedAt: new Date(now - 40000).toISOString(),
    },
    {
      id: uid(),
      text: "My doctor said walk 10,000 steps a day. I asked if pacing counts. He sighed.",
      author: "Grandma",
      dateSaid: new Date(Date.UTC(2025, 3, 8)).toISOString(),
      context: "Family phone call",
      tags: "health, grandma",
      rating: 4,
      favorite: false,
      groupId: null,
      createdAt: new Date(now - 30000).toISOString(),
      updatedAt: new Date(now - 30000).toISOString(),
    },
    {
      id: uid(),
      text: "I'm on a seafood diet. I see food and I eat it.",
      author: "Uncle Ray",
      dateSaid: new Date(Date.UTC(2025, 0, 1)).toISOString(),
      context: "New Year's dinner, right on cue",
      tags: "dad-jokes, holidays",
      rating: 2,
      favorite: false,
      groupId: null,
      createdAt: new Date(now - 20000).toISOString(),
      updatedAt: new Date(now - 20000).toISOString(),
    },
    {
      id: uid(),
      text: "WiFi went down for five minutes, so I had to talk to my family. They seem like nice people.",
      author: "Jordan",
      dateSaid: new Date(Date.UTC(2025, 6, 18)).toISOString(),
      context: "Tweeted during the great outage of July",
      tags: "relatable, tech",
      rating: 5,
      favorite: false,
      groupId: null,
      createdAt: new Date(now - 10000).toISOString(),
      updatedAt: new Date(now - 10000).toISOString(),
    },
  ];

  const tx = db.transaction("quotes", "readwrite");
  for (const q of samples) await tx.store.put(q);
  await tx.done;

  // Sample group with members, assign 3 quotes to it.
  const groupId = uid();
  const group: GroupDoc = {
    id: groupId,
    name: "Family Group Chat",
    description: "The greatest hits from the family thread.",
    inviteCode: inviteCode(),
    ownerName: "you",
    createdAt: new Date(now - 70000).toISOString(),
    updatedAt: new Date(now - 70000).toISOString(),
    members: [
      { id: uid(), groupId, name: "you", email: null, role: "owner", joinedAt: new Date(now - 70000).toISOString() },
      { id: uid(), groupId, name: "Dad", email: null, role: "member", joinedAt: new Date(now - 65000).toISOString() },
      { id: uid(), groupId, name: "Mia", email: null, role: "member", joinedAt: new Date(now - 60000).toISOString() },
      { id: uid(), groupId, name: "Grandma", email: null, role: "member", joinedAt: new Date(now - 55000).toISOString() },
    ],
  };
  await db.put("groups", group);

  // Assign Dad, Mia, Grandma quotes to the group.
  const dad = samples.find((s) => s.author === "Dad");
  const mia = samples.find((s) => s.author === "Mia (age 4)");
  const grandma = samples.find((s) => s.author === "Grandma");
  for (const q of [dad, mia, grandma]) {
    if (q) {
      q.groupId = groupId;
      await db.put("quotes", q);
    }
  }

  seeded = true;
}

// ── Quotes ─────────────────────────────────────────────────────────────────

export async function fetchLocalQuotes(): Promise<Quote[]> {
  await ensureSeeded();
  const db = await getDB();
  const all = (await db.getAll("quotes")) as Quote[];
  all.sort((a, b) => {
    const aDate = a.dateSaid ?? "";
    const bDate = b.dateSaid ?? "";
    if (aDate !== bDate) return bDate < aDate ? -1 : 1;
    return b.createdAt < a.createdAt ? -1 : 1;
  });
  return all;
}

export async function createLocalQuote(input: QuoteInput): Promise<Quote> {
  const db = await getDB();
  const now = new Date().toISOString();
  const quote: Quote = {
    id: uid(),
    text: input.text.trim(),
    author: input.author.trim(),
    dateSaid: input.dateSaid,
    context: input.context ?? null,
    tags: input.tags ?? "",
    rating: input.rating ?? 3,
    favorite: Boolean(input.favorite),
    groupId: input.groupId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("quotes", quote);
  return quote;
}

export async function updateLocalQuote(
  id: string,
  input: QuoteInput
): Promise<Quote> {
  const db = await getDB();
  const existing = (await db.get("quotes", id)) as Quote | undefined;
  if (!existing) throw new Error("Quote not found");
  const quote: Quote = {
    ...existing,
    text: input.text.trim(),
    author: input.author.trim(),
    dateSaid: input.dateSaid,
    context: input.context ?? null,
    tags: input.tags ?? "",
    rating: input.rating ?? 3,
    favorite: Boolean(input.favorite),
    groupId: input.groupId ?? null,
    updatedAt: new Date().toISOString(),
  };
  await db.put("quotes", quote);
  return quote;
}

export async function patchLocalQuote(
  id: string,
  patch: Partial<QuoteInput>
): Promise<void> {
  const db = await getDB();
  const existing = (await db.get("quotes", id)) as Quote | undefined;
  if (!existing) throw new Error("Quote not found");
  const next: Quote = {
    ...existing,
    ...(patch.favorite !== undefined ? { favorite: patch.favorite } : {}),
    ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
    ...(patch.text !== undefined ? { text: patch.text.trim() } : {}),
    ...(patch.author !== undefined ? { author: patch.author.trim() } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.context !== undefined
      ? { context: patch.context ? patch.context.trim() : null }
      : {}),
    ...(patch.groupId !== undefined ? { groupId: patch.groupId ?? null } : {}),
    ...(patch.dateSaid !== undefined ? { dateSaid: patch.dateSaid } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.put("quotes", next);
}

export async function deleteLocalQuote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("quotes", id);
}

// ── Groups ─────────────────────────────────────────────────────────────────

async function computeGroupDetails(
  groups: GroupDoc[]
): Promise<GroupWithDetails[]> {
  const db = await getDB();
  const quotes = (await db.getAll("quotes")) as Quote[];
  const countByGroup = new Map<string, number>();
  for (const q of quotes) {
    if (q.groupId) countByGroup.set(q.groupId, (countByGroup.get(q.groupId) ?? 0) + 1);
  }
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    inviteCode: g.inviteCode,
    ownerName: g.ownerName,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    members: g.members,
    quoteCount: countByGroup.get(g.id) ?? 0,
  }));
}

export async function fetchLocalGroups(): Promise<GroupWithDetails[]> {
  await ensureSeeded();
  const db = await getDB();
  const docs = (await db.getAll("groups")) as GroupDoc[];
  const result = await computeGroupDetails(docs);
  result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return result;
}

export async function fetchLocalGroup(
  id: string
): Promise<(GroupWithDetails & { quotes: Quote[] }) | null> {
  await ensureSeeded();
  const db = await getDB();
  const doc = (await db.get("groups", id)) as GroupDoc | undefined;
  if (!doc) return null;
  const [detail] = await computeGroupDetails([doc]);
  const quotes = (await db.getAll("quotes")) as Quote[];
  return { ...detail, quotes: quotes.filter((q) => q.groupId === id) };
}

export async function createLocalGroup(input: GroupInput): Promise<Group> {
  const db = await getDB();
  const now = new Date().toISOString();
  const ownerName = input.ownerName?.trim() || "you";
  const id = uid();
  const doc: GroupDoc = {
    id,
    name: input.name.trim(),
    description: input.description ?? null,
    inviteCode: inviteCode(),
    ownerName,
    createdAt: now,
    updatedAt: now,
    members: [
      { id: uid(), groupId: id, name: ownerName, email: null, role: "owner", joinedAt: now },
    ],
  };
  await db.put("groups", doc);
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    inviteCode: doc.inviteCode,
    ownerName: doc.ownerName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function updateLocalGroup(
  id: string,
  input: Partial<GroupInput>
): Promise<void> {
  const db = await getDB();
  const doc = (await db.get("groups", id)) as GroupDoc | undefined;
  if (!doc) throw new Error("Group not found");
  if (input.name !== undefined) doc.name = input.name.trim();
  if (input.description !== undefined)
    doc.description = input.description ? input.description.trim() : null;
  doc.updatedAt = new Date().toISOString();
  await db.put("groups", doc);
}

export async function deleteLocalGroup(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("groups", id);
  // Unfile quotes that belonged to this group.
  const quotes = (await db.getAll("quotes")) as Quote[];
  const tx = db.transaction("quotes", "readwrite");
  for (const q of quotes) {
    if (q.groupId === id) {
      q.groupId = null;
      await tx.store.put(q);
    }
  }
  await tx.done;
}

export async function addLocalMember(
  groupId: string,
  input: MemberInput
): Promise<void> {
  const db = await getDB();
  const doc = (await db.get("groups", groupId)) as GroupDoc | undefined;
  if (!doc) throw new Error("Group not found");
  const name = input.name.trim();
  if (doc.members.some((m) => m.name === name)) {
    throw new Error("A member with that name already exists in this group");
  }
  doc.members.push({
    id: uid(),
    groupId,
    name,
    email: input.email ?? null,
    role: "member",
    joinedAt: new Date().toISOString(),
  });
  doc.updatedAt = new Date().toISOString();
  await db.put("groups", doc);
}

export async function removeLocalMember(
  groupId: string,
  memberId: string
): Promise<void> {
  const db = await getDB();
  const doc = (await db.get("groups", groupId)) as GroupDoc | undefined;
  if (!doc) throw new Error("Group not found");
  const target = doc.members.find((m) => m.id === memberId);
  if (target?.role === "owner") {
    throw new Error("Can't remove the group owner");
  }
  doc.members = doc.members.filter((m) => m.id !== memberId);
  doc.updatedAt = new Date().toISOString();
  await db.put("groups", doc);
}

export async function joinLocalGroup(
  inviteCodeStr: string,
  name: string,
  email?: string
): Promise<{ group: { id: string; name: string }; alreadyMember: boolean }> {
  const db = await getDB();
  const docs = (await db.getAll("groups")) as GroupDoc[];
  const doc = docs.find((g) => g.inviteCode === inviteCodeStr.trim());
  if (!doc) throw new Error("Invalid invite code");
  const alreadyMember = doc.members.some((m) => m.name === name.trim());
  if (!alreadyMember) {
    doc.members.push({
      id: uid(),
      groupId: doc.id,
      name: name.trim(),
      email: email ?? null,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
    doc.updatedAt = new Date().toISOString();
    await db.put("groups", doc);
  }
  return { group: { id: doc.id, name: doc.name }, alreadyMember };
}
