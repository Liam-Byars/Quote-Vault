# Quote Vault

Your app is live at: https://quotevault-faa66.web.app

## How to update the live site (when the app's code changes)

There are two ways. You only need ONE of them.

### Option A — GitHub auto-deploy (recommended: no commands, ever)

Once this is set up, the site updates itself a few minutes after files
reach GitHub. This project already contains the auto-deploy recipe
(`.github/workflows/firebase-hosting-merge.yml`).

One-time setup:

1. Create a repository on https://github.com (e.g. named `quotevault`).
2. Upload this project's files to it. On the repo page click
   "uploading an existing file", then drag in everything from this
   folder EXCEPT `node_modules`, `.next`, `out`, and log files
   (those are build junk / auto-generated). Click **Commit changes**.
3. Firebase console (https://console.firebase.google.com, project
   quotevault-faa66) → Build → Hosting → GitHub tab → **Connect to
   GitHub** → authorize → pick your repo + the `main` branch → continue.
   Firebase creates the secret the workflow needs. Done.

From then on: to update the site, upload the changed files to GitHub
(or edit them right on github.com) — a couple of minutes later the
live site updates by itself. Watch it happen under your repo's
**Actions** tab (orange dot = building, green check = live).

### Option B — from your computer (works, just more steps)

Open this folder in Terminal / PowerShell and run the two commands:

```
npx next build
firebase deploy --only hosting
```

That's it — takes about a minute.

---

Either way: you do NOT need to re-deploy for quotes/groups/favorites —
those save to Firestore instantly the moment you add them. You only
re-deploy when the app itself changes (new features, fixes, etc.).

## ONE-TIME: new Firestore rules (required for shared groups + real-time)

Group sharing stores quotes in a shared spot so every member sees new
quotes within seconds. The old security rules blocked that. One time only:

1. Go to https://console.firebase.google.com (project: quotevault-faa66)
2. Build -> Firestore Database -> Rules
3. Delete what's in the editor, paste in the contents of
   `firestore-rules.txt` (it's in this folder), click **Publish**

Without this, creating groups and sharing quotes will fail with
"permission denied".

## Good to know

- Sign in with Google to sync your quotes across devices and share groups.
- Group invite links / QR codes always point to
  https://quotevault-faa66.web.app
- Deleting a group also deletes the quotes shared inside it.
- Not signed in? Quotes are saved only in that browser (local mode).
