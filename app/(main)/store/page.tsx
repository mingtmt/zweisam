"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Reward } from "@/lib/types";

export default function StorePage() {
  const { firebaseUser, userDoc, setUserDoc } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(
          collection(db, "rewards"),
          where("status", "==", "available")
        );
        const snap = await getDocs(q);
        setRewards(
          snap.docs.map((d) => ({ ...d.data(), id: d.id } as Reward))
        );
      } catch {
        setError("Failed to load rewards. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function claimReward(reward: Reward) {
    if (claiming || !userDoc || !reward.id) return;
    if (userDoc.points < reward.pointCost) return;

    const rewardId = reward.id;

    try {
      setClaiming(rewardId);
      await runTransaction(db, async (tx) => {
        const uRef = doc(db, "users", firebaseUser!.uid);
        const rRef = doc(db, "rewards", rewardId);
        const uSnap = await tx.get(uRef);
        const rSnap = await tx.get(rRef);
        if (!uSnap.exists() || !rSnap.exists()) throw new Error("Document not found");
        if (uSnap.data().points < reward.pointCost) throw new Error("Insufficient points");
        tx.update(uRef, { points: uSnap.data().points - reward.pointCost });
        tx.update(rRef, { status: "claimed" });
      });
      setRewards((prev) => prev.filter((r) => r.id !== rewardId));
      setUserDoc((prev) =>
        prev ? { ...prev, points: prev.points - reward.pointCost } : prev
      );
    } catch {
      setError("Failed to claim reward. Please try again.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center text-zinc-500">
        Loading...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-4 py-5">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Store</h1>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
          {userDoc?.points ?? 0} pts
        </span>
      </header>

      {rewards.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No rewards available right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rewards.map((reward) => {
            const canAfford = userDoc ? userDoc.points >= reward.pointCost : false;
            return (
              <div
                key={reward.id}
                className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-sm font-semibold">{reward.title}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {reward.pointCost} pts
                  </span>
                </div>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {reward.description}
                </p>
                <button
                  onClick={() => claimReward(reward)}
                  disabled={!canAfford || claiming === reward.id}
                  className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
                    canAfford && claiming !== reward.id
                      ? "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800"
                      : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {claiming === reward.id
                    ? "Claiming..."
                    : canAfford
                    ? "Claim Reward"
                    : "Not enough points"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}