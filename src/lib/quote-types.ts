// Shared types for the Quote Vault app.

export type VoiceFont = "normal" | "bold" | "cursive" | "italic" | "shout";

export type Quote = {
  id: string;
  text: string;
  author: string;
  dateSaid: string | null;
  context: string | null;
  tags: string;
  rating: number;
  favorite: boolean;
  groupId: string | null;
  voiceFont?: VoiceFont;
  createdAt: string;
  updatedAt: string;
};

export type QuoteInput = {
  text: string;
  author: string;
  dateSaid: string | null;
  context?: string | null;
  tags?: string;
  rating?: number;
  favorite?: boolean;
  groupId?: string | null;
  voiceFont?: VoiceFont;
};

// CSS style applied to the quote text based on the voice font.
export function voiceFontStyle(voiceFont?: VoiceFont): React.CSSProperties {
  switch (voiceFont) {
    case "bold":
      return { fontWeight: 700, fontFamily: "Georgia, serif" };
    case "cursive":
      return { fontFamily: "'Comic Sans MS', cursive", fontStyle: "italic" };
    case "italic":
      return { fontStyle: "italic" };
    case "shout":
      return { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" };
    default:
      return {};
  }
}

export type QuoteStats = {
  total: number;
  favorites: number;
  thisMonth: number;
  uniqueAuthors: number;
  avgRating: number;
  topAuthors: { author: string; count: number }[];
  monthlyCounts: { label: string; count: number }[];
};

// Parse multiple authors from a comma-separated string.
// "Liam, Grandma" → ["Liam", "Grandma"]
export function parseAuthors(author: string): string[] {
  if (!author) return [];
  return author
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Tag chips parsed from the comma-separated string.
export function parseTags(tags: string): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Deterministic color for an avatar based on the author's name.
export function authorColor(author: string): string {
  const palette = [
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    "bg-pink-500/15 text-pink-700 dark:text-pink-300",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = (hash * 31 + author.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

// Initials for the avatar circle.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
