// Admin account configuration.
//
// The admin is identified by their Google sign-in email. This gives them
// special powers in the app: an admin badge, the ability to toggle
// maintenance mode, and (future) a moderation view to see all content.
//
// Security note: this email is NOT a secret — it's just a permission check.
// The actual security comes from Google sign-in (password + 2FA on the
// Google account itself). Anyone could know this email and still not be
// able to sign in as you.

export const ADMIN_EMAIL = "lpbmusic5426@gmail.com";

export function isAdminEmail(
  email: string | null | undefined
): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
