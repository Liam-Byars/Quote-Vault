// Single source of truth for the app's version number.
//
// Format: MAJOR.MINOR.PATCH  (each zero-padded to 2 digits, e.g. 1.00.01)
//
//   MAJOR  — only changes when you explicitly say "bump to version X"
//            (big redesigns / milestones). Stays at 1 until you say otherwise.
//   MINOR  — bumps for new features (1.00.03 -> 1.01.01)
//   PATCH  — bumps for small fixes/tweaks (1.00.01 -> 1.00.02 -> 1.00.03)
//
// When patch or minor bumps, the numbers to the right reset to 01.
// When major bumps (only on your word), everything resets: 2.00.01.
export const APP_VERSION = "1.00.04";
