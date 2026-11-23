// Company info — shown in the footer, TOS, and Privacy Policy.
export const COMPANY_NAME = "LPBEnterprises";
export const SUPPORT_EMAIL = "lpbmusic5426@gmail.com";

// Tip jar link — Cash App. Users tap "Support Quote Vault" → opens Cash App.
export const TIP_JAR_URL = "https://cash.app/$lpbyars";

// NOTE: Admin emails are NO LONGER stored in client-side code.
// Admin status is checked via Firestore: the app tries to read from the
// "admin-only" collection. If the read succeeds (Firestore rules allow
// it for admin emails), the user is an admin. If denied, they're not.
// The actual admin emails live ONLY in the Firestore security rules
// (server-side), so they're invisible to anyone viewing the app's source code.
