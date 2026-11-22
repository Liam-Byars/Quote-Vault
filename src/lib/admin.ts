// Admin account configuration.
//
// The admin is identified by their Google sign-in email. This gives them
// special powers in the app: an admin badge, the ability to toggle
// maintenance mode, and a moderation view to see all content.
//
// Security note: these emails are NOT secrets — they're just permission
// checks. The actual security comes from Google sign-in (password + 2FA
// on the Google account itself).

export const ADMIN_EMAILS = [
  "lpbmusic5426@gmail.com",
  "lpbyars@gmail.com",
];

// Company info — shown in the footer, TOS, and Privacy Policy.
export const COMPANY_NAME = "LPBEnterprises";
export const SUPPORT_EMAIL = "lpbmusic5426@gmail.com";

// Tip jar link — Cash App. Users tap "Support Quote Vault" → opens Cash App.
export const TIP_JAR_URL = "https://cash.app/$lpbyars";

export function isAdminEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === lower);
}
