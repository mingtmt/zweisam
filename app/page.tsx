"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { logOut } from "@/lib/auth";
import type { User } from "firebase/auth";
import type { User as UserDoc } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center text-zinc-500">
        Loading...
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-3">
        {userDoc?.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userDoc.photoURL}
            alt="Profile"
            className="h-16 w-16 rounded-full"
          />
        )}
        <h1 className="text-2xl font-semibold">
          Welcome, {userDoc?.displayName ?? user?.displayName}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Points: {userDoc?.points ?? 0}
        </p>
        {userDoc?.partnerId ? (
          <p className="text-green-600">Paired with partner</p>
        ) : (
          <p className="text-zinc-500">Your invite code: {userDoc?.inviteCode}</p>
        )}
        <button
          onClick={handleLogout}
          className="mt-4 rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}