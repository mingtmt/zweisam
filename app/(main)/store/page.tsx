"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  doc,
  runTransaction,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import NewRewardModal from "@/components/NewRewardModal";
import ConfirmModal from "@/components/ConfirmModal";
import type { Reward } from "@/lib/types";

type ConfirmAction = { kind: "claim"; reward: Reward } | { kind: "delete"; reward: Reward };

export default function StorePage() {
  const { firebaseUser, userDoc, setUserDoc } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNewReward, setShowNewReward] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "rewards"));
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
    if (busyId || !userDoc || !firebaseUser || !reward.id) return;
    if (userDoc.points < reward.pointCost) return;

    const rewardId = reward.id;
    try {
      setBusyId(rewardId);
      await runTransaction(db, async (tx) => {
        const uRef = doc(db, "users", firebaseUser.uid);
        const rRef = doc(db, "rewards", rewardId);
        const uSnap = await tx.get(uRef);
        const rSnap = await tx.get(rRef);
        if (!uSnap.exists() || !rSnap.exists()) throw new Error("Document not found");
        if (uSnap.data().points < reward.pointCost) throw new Error("Insufficient points");
        tx.update(uRef, { points: uSnap.data().points - reward.pointCost });
        await tx.delete(rRef);
      });
      setRewards((prev) => prev.filter((r) => r.id !== rewardId));
      setUserDoc((prev) =>
        prev ? { ...prev, points: prev.points - reward.pointCost } : prev
      );
    } catch {
      setError("Failed to claim reward. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReward(reward: Reward) {
    if (busyId || !reward.id) return;

    const rewardId = reward.id;
    try {
      setBusyId(rewardId);
      await deleteDoc(doc(db, "rewards", rewardId));
      setRewards((prev) => prev.filter((r) => r.id !== rewardId));
    } catch {
      setError("Failed to delete reward. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.kind === "claim") claimReward(confirmAction.reward);
    else deleteReward(confirmAction.reward);
    setConfirmAction(null);
  }

  function handleNewRewardCreated(reward: Reward) {
    setRewards((prev) => [reward, ...prev]);
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

      <button
        onClick={() => setShowNewReward(true)}
        className="mb-4 w-full rounded-xl border-2 border-dashed border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/20"
      >
        ＋ New Reward
      </button>

      {rewards.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">
            No rewards yet. Add one to get started.
          </p>
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
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">{reward.title}</h3>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {reward.pointCost} pts
                  </span>
                </div>
                {reward.description && (
                  <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {reward.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setConfirmAction({ kind: "claim", reward })
                    }
                    disabled={!canAfford || busyId === reward.id}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      canAfford && busyId !== reward.id
                        ? "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800"
                        : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {canAfford ? "Get Reward" : "Not enough points"}
                  </button>
                  <button
                    onClick={() =>
                      setConfirmAction({ kind: "delete", reward })
                    }
                    disabled={busyId === reward.id}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewReward && firebaseUser && (
        <NewRewardModal
          creatorUid={firebaseUser.uid}
          onCreated={handleNewRewardCreated}
          onClose={() => setShowNewReward(false)}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.kind === "claim" ? "Claim Reward" : "Delete Reward"
          }
          message={
            confirmAction.kind === "claim"
              ? `Spend ${confirmAction.reward.pointCost} points to claim "${confirmAction.reward.title}"?`
              : `Are you sure you want to delete "${confirmAction.reward.title}"? This cannot be undone.`
          }
          confirmLabel={
            confirmAction.kind === "claim"
              ? `Claim (${confirmAction.reward.pointCost} pts)`
              : "Delete"
          }
          danger={confirmAction.kind === "delete"}
          onConfirm={handleConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </main>
  );
}