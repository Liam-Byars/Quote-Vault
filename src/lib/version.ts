// Single source of truth for the app's version number.
//
// Format: MAJOR.BIG_UPDATE.FEATURE.BUGFIX  (4 digits)
//
//   MAJOR      — only changes when you explicitly say "bump to 3"
//                 (big redesigns / milestones). Stays at 2 until you say.
//   BIG_UPDATE — major feature batches (2.9.1.1 → 2.10.0.0)
//   FEATURE    — individual new features (2.9.1.1 → 2.9.2.0)
//   BUGFIX     — small fixes and tweaks (2.9.1.0 → 2.9.1.1 → 2.9.1.2)
//
// When a digit bumps, the ones to its right reset to 0.
// MAJOR only changes on your word: 3.0.0.0
//
// Note: package.json stays at 3-digit semver (2.9.1) for npm compatibility.
//       This 4-digit version is for display only (footer, etc.).
// 2.9.2.0 — daily reminder notifications (Bell button in header, background
//           periodic-sync + in-app fallback, per-device time picker).
// 2.9.2.1 — preserve line breaks in quotes: newlines typed in the form now
//           render in the card, Quote of the Day, and shared image.
export const APP_VERSION = "2.9.2.1";
