// Single source of truth for the app's version number.
//
// Format: MAJOR.MINOR.PATCH  (standard semantic versioning, no padding)
//
//   MAJOR  — only changes when you explicitly say "bump to 2"
//            (big redesigns / milestones). Stays at 1 until you say otherwise.
//   MINOR  — bumps for new features (1.1.0 -> 1.2.0)
//   PATCH  — bumps for small fixes/tweaks (1.1.0 -> 1.1.1 -> 1.1.2)
//
// When patch or minor bumps, the numbers to the right reset to 0.
// When major bumps (only on your word), everything resets: 2.0.0.
//
// v2.0.0 — The Big Update:
//   Quote of the Day + On this Day + Share as image
//   Stats dashboard with charts
//   Color theme customization (8 presets)
//   Reminders (7-day inactivity banner)
//   Admin moderation view
//   Better search (date range)
//   Laugh reactions on quotes
//   Optional author/date fields
//   Email invite for group members
//   Maintenance mode
//   Admin account system
export const APP_VERSION = "2.9.0";
