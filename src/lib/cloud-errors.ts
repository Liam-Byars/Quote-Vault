"use client";

// Maps Firebase error codes to clear, actionable messages so cloud failures
// are never silent (e.g., a group that "loads forever" is almost always a
// permission error because the Firestore rules aren't set up yet).

export function describeCloudError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes("permission-denied")) {
    return "Cloud save blocked (permission denied). Open Firebase Console → Firestore → Rules and paste the rules from the app docs, then try again.";
  }
  if (raw.includes("failed-precondition") || raw.includes("indexes")) {
    return "Firestore isn't set up yet. Open Firebase Console → Firestore Database → Create database, then try again.";
  }
  if (raw.includes("unavailable") || raw.includes("network")) {
    return "Can't reach Firestore — check your internet connection and try again.";
  }
  if (raw.includes("unauthenticated") || raw.includes("requires-recent-login")) {
    return "You need to sign in again — tap Sign out, then Sign in.";
  }
  if (raw.includes("quota-exceeded") || raw.includes("resource-exhausted")) {
    return "Firestore free quota hit for today — try again tomorrow.";
  }
  // Trim long firebase messages to something readable.
  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}
