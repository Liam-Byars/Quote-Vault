// Firebase initialization.
//
// Config comes from .env.local (NEXT_PUBLIC_ vars, exposed to the client).
// When the config is present, Firebase (Auth + Firestore) is initialized
// eagerly and exported for use across the app. When absent, the app falls
// back to local (Prisma/SQLite) mode and these exports are null.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  // Firebase web config for the quotevault-faa66 project. Firebase web API
  // keys are safe to expose (security is enforced by Auth + Firestore rules,
  // not the key). Env vars override these if present.
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBFlQpawmwLaWuBwILe7RcVZ8zilvuldBU",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "quotevault-faa66.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "quotevault-faa66",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "quotevault-faa66.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "812203315677",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:812203315677:web:2c4fa15ebe8974ba256634",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1DMGP504FD",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

// Single shared app instance (safe under HMR / React strict mode).
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // The Firestore database in this project is named "quotevault" (not the
  // standard "(default)"). If the databaseId isn't specified, the SDK looks
  // for "(default)" and throws "Database '(default)' not found".
  db = getFirestore(app, "quotevault");
}

export { app, auth, db };

// Firestore security rules to paste into the Firebase console
// (Firestore → Rules → paste → Publish). Covers the shared-groups model:
// personal quotes are private; group quotes are readable in real time by
// members; members join via invite codes; owners manage their groups.
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//
//       // Personal quotes — only you can read/write your own.
//       match /quotes/{quoteId} {
//         allow read, update, delete: if request.auth != null
//           && resource.data.uid == request.auth.uid;
//         allow create: if request.auth != null
//           && request.resource.data.uid == request.auth.uid;
//       }
//
//       // Groups — signed-in users can read (needed to look up invite
//       // codes); only the owner can change or delete a group.
//       match /groups/{groupId} {
//         allow read: if request.auth != null;
//         allow create: if request.auth != null
//           && request.resource.data.ownerUid == request.auth.uid;
//         allow update, delete: if request.auth != null
//           && resource.data.ownerUid == request.auth.uid;
//
//         // Joined members — one doc per user, doc id = their uid.
//         match /members/{memberId} {
//           allow read: if request.auth != null;
//           allow create: if request.auth != null
//             && request.auth.uid == memberId;
//           allow delete: if request.auth != null
//             && (request.auth.uid == memberId
//                 || get(/databases/$(database)/documents/groups/$(groupId)).data.ownerUid == request.auth.uid);
//         }
//
//         // Shared group quotes — members see them in real time.
//         match /quotes/{quoteId} {
//           function isMember() {
//             return request.auth != null
//               && exists(/databases/$(database)/documents/users/$(request.auth.uid)/groupMemberships/$(groupId));
//           }
//           function isGroupOwner() {
//             return request.auth != null
//               && get(/databases/$(database)/documents/groups/$(groupId)).data.ownerUid == request.auth.uid;
//           }
//           allow read: if isMember();
//           allow create: if isMember()
//             && request.resource.data.uid == request.auth.uid;
//           allow update: if isMember();
//           allow delete: if isMember()
//             && (resource.data.uid == request.auth.uid || isGroupOwner());
//         }
//       }
//
//       // Membership pointers (users/{uid}/groupMemberships/{groupId}) —
//       // your own list; the group owner cleans them up when deleting a group.
//       match /users/{uid}/groupMemberships/{groupId} {
//         allow read, write: if request.auth != null
//           && (request.auth.uid == uid
//               || get(/databases/$(database)/documents/groups/$(groupId)).data.ownerUid == request.auth.uid);
//       }
//     }
//   }
