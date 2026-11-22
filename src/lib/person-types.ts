// Person profile types — extra info about the people you quote.

export type Person = {
  id: string;
  uid: string;
  name: string;
  lastName: string;
  middleInitial: string;
  birthday: string | null; // yyyy-mm-dd
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonInput = {
  lastName?: string;
  middleInitial?: string;
  birthday?: string | null;
  notes?: string;
};

// Deterministic ID for a person profile (uid + name slug).
// This ensures one profile per person per user.
export function personId(uid: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
  return `${uid}_${slug}`;
}
