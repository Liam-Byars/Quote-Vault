"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isFirebaseConfigured,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(() => !!auth);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setIsAdmin(false);
    });
    return () => unsub();
  }, []);

  // Check admin status by trying to read an admin-only Firestore document.
  // The Firestore rules only allow admin emails to read this collection.
  // If the read succeeds → user is admin. If denied → not admin.
  // This keeps admin emails OUT of the client-side code entirely.
  useEffect(() => {
    if (!user || !db) {
      setIsAdmin(false);
      return;
    }
    getDoc(doc(db, "admin-only", "check"))
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [user]);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error("Firebase isn't configured");
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isFirebaseConfigured,
      isAdmin,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
