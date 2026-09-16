"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import type { User as FirestoreUser } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: FirestoreUser | null;
  loading: boolean;
  setUserDoc: React.Dispatch<React.SetStateAction<FirestoreUser | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setUserDoc(null);
        setLoading(false);
        return;
      }
      setFirebaseUser(user);
      const snap = await getDoc(doc(db, "users", user.uid));
      setUserDoc(snap.exists() ? (snap.data() as FirestoreUser) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading, setUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}