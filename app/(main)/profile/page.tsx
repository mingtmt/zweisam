"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  runTransaction,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import { logOut } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, userDoc, setUserDoc, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !firebaseUser) router.replace("/login");
  }, [authLoading, firebaseUser, router]);

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  const copyCode = async () => {
    if (!userDoc?.inviteCode) return;
    await navigator.clipboard.writeText(userDoc.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pairWithPartner = async () => {
    if (!userDoc || !firebaseUser) return;
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;

    setPairError("");
    setPairing(true);

    try {
      let pairedPartnerId: string | null = null;

      await runTransaction(db, async (tx) => {
        const q = query(
          collection(db, "users"),
          where("inviteCode", "==", code)
        );
        const snap = await getDocs(q);

        if (snap.empty) throw new Error("No user found with that code.");

        const partnerSnap = snap.docs[0];
        const partnerId = partnerSnap.id;

        if (partnerId === firebaseUser.uid)
          throw new Error("You cannot pair with yourself.");

        const partnerData = partnerSnap.data();
        if (partnerData.partnerId)
          throw new Error("That user is already paired.");

        const meRef = doc(db, "users", firebaseUser.uid);
        const partnerRef = doc(db, "users", partnerId);
        const meSnap = await tx.get(meRef);
        if (meSnap.data()?.partnerId)
          throw new Error("You are already paired.");

        tx.update(meRef, { partnerId });
        tx.update(partnerRef, { partnerId: firebaseUser.uid });
        pairedPartnerId = partnerId;
      });

      setUserDoc((prev) =>
        prev ? { ...prev, partnerId: pairedPartnerId! } : prev
      );
      setInviteCodeInput("");
    } catch (e: unknown) {
      setPairError(e instanceof Error ? e.message : "Pairing failed.");
    } finally {
      setPairing(false);
    }
  };

  const disconnectFromPartner = async () => {
    if (!userDoc || !firebaseUser) return;
    if (!userDoc.partnerId) return;
    if (!window.confirm("Disconnect from your partner?")) return;

    setPairError("");
    setDisconnecting(true);

    try {
      await runTransaction(db, async (tx) => {
        const meRef = doc(db, "users", firebaseUser.uid);
        const partnerRef = doc(db, "users", userDoc.partnerId!);
        tx.update(meRef, { partnerId: null });
        tx.update(partnerRef, { partnerId: null });
      });

      setUserDoc((prev) => (prev ? { ...prev, partnerId: null } : prev));
    } catch {
      setPairError("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (authLoading || !userDoc) {
    return (
      <main className="flex flex-1 items-center justify-center text-zinc-500">
        Loading...
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-4 py-5">
      <h1 className="mb-5 text-xl font-semibold">Profile</h1>

      <div className="mb-5 flex flex-col items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-6 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Avatar
          src={userDoc.photoURL}
          name={userDoc.displayName}
          className="h-16 w-16 rounded-full"
        />
        <div className="text-center">
          <h2 className="text-lg font-semibold">{userDoc.displayName}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{userDoc.email}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Points Balance
        </h3>
        <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
          {userDoc.points}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Pairing
        </h3>
        {userDoc.partnerId ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-green-600 dark:text-green-400">
              Paired with partner ✓
            </p>
            <button
              onClick={disconnectFromPartner}
              disabled={disconnecting}
              className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
            {pairError && <p className="text-xs text-red-500">{pairError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Share your invite code with your partner:
            </p>
            <button
              onClick={copyCode}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest dark:border-zinc-700 dark:bg-zinc-800"
            >
              {userDoc.inviteCode}
            </button>
            {copied && (
              <p className="text-center text-xs text-green-600 dark:text-green-400">
                Copied to clipboard!
              </p>
            )}

            <div className="my-1 flex items-center gap-3 text-zinc-300 dark:text-zinc-600">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-[10px] uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter your partner&apos;s invite code:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  setPairError("");
                }}
                placeholder="XXXXXX"
                maxLength={6}
                className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-center font-mono text-sm font-bold tracking-widest uppercase outline-none transition-colors focus:border-rose-400 focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-rose-500"
              />
              <button
                onClick={pairWithPartner}
                disabled={pairing || inviteCodeInput.trim().length < 6}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
              >
                {pairing ? "..." : "Connect"}
              </button>
            </div>
            {pairError && (
              <p className="text-xs text-red-500">{pairError}</p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </main>
  );
}