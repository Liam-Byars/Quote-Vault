// Shared types for the Groups feature.

export type GroupMember = {
  id: string;
  groupId: string;
  name: string;
  email: string | null;
  role: string; // "owner" | "member"
  joinedAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

// Group with related data for list/detail views.
export type GroupWithDetails = Group & {
  members: GroupMember[];
  quoteCount: number;
};

export type GroupInput = {
  name: string;
  description?: string | null;
  ownerName?: string;
};

export type MemberInput = {
  name: string;
  email?: string | null;
};

// The live app URL. Invite links/QR codes are ALWAYS built from this — not
// window.location — so invites generated anywhere (dev server, preview
// sandbox, etc.) still point people at the real deployed app.
export const APP_ORIGIN = "https://quotevault-faa66.web.app";

// Relative invite path with the invite code as a query param; the app reads
// `?join=<code>` on load to offer joining.
export function invitePath(inviteCode: string): string {
  return `/?join=${encodeURIComponent(inviteCode)}`;
}

export function inviteUrl(inviteCode: string): string {
  return `${APP_ORIGIN}${invitePath(inviteCode)}`;
}
