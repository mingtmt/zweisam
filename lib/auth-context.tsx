"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { coupleIdFor, ensureCouple } from "@/lib/couple";
import type { User as FirebaseUser } from "firebase/auth";
import type { User as FirestoreUser } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: FirestoreUser | null;
  partnerDoc: FirestoreUser | null;
  /** Set only once the couple doc + coupleId are in place for both partners. */
  coupleId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userState, setUserState] = useState<{
    uid: string;
    doc: FirestoreUser | null;
  } | null>(null);
  const [partnerState, setPartnerState] = useState<{
    uid: string;
    doc: FirestoreUser | null;
  } | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        setAuthLoading(false);
      }),
    []
  );

  const uid = firebaseUser?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) =>
        setUserState({
          uid,
          doc: snap.exists() ? ({ ...snap.data(), id: snap.id } as FirestoreUser) : null,
        }),
      (e) => {
        console.error("Failed to load user profile:", e);
        setUserState({ uid, doc: null });
      }
    );
  }, [uid]);

  const userDoc = uid && userState?.uid === uid ? userState.doc : null;
  const partnerId = userDoc?.partnerId ?? null;

  useEffect(() => {
    if (!partnerId) return;
    return onSnapshot(
      doc(db, "users", partnerId),
      (snap) =>
        setPartnerState({
          uid: partnerId,
          doc: snap.exists() ? ({ ...snap.data(), id: snap.id } as FirestoreUser) : null,
        }),
      (e) => {
        console.error("Failed to load partner profile:", e);
        setPartnerState({ uid: partnerId, doc: null });
      }
    );
  }, [partnerId]);

  const partnerDoc =
    partnerId && partnerState?.uid === partnerId ? partnerState.doc : null;

  const expectedCoupleId = uid && partnerId ? coupleIdFor(uid, partnerId) : null;
  const coupleReady =
    expectedCoupleId !== null &&
    userDoc?.coupleId === expectedCoupleId &&
    partnerDoc?.partnerId === uid;

  // Heal pairs created before couple docs existed.
  useEffect(() => {
    if (!uid || !partnerId || !partnerDoc || coupleReady) return;
    if (partnerDoc.partnerId !== uid) return;
    ensureCouple(db, uid, partnerId).catch((e) =>
      console.error("Failed to set up couple:", e)
    );
  }, [uid, partnerId, partnerDoc, coupleReady]);

  const loading = authLoading || (uid !== null && userState?.uid !== uid);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        partnerDoc,
        coupleId: coupleReady ? expectedCoupleId : null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
