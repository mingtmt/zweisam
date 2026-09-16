"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import type { Quest } from "@/lib/types";

export default function HomePage() {
  const { userDoc, setUserDoc } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(
          collection(db, "quests"),
          where("active", "==", true)
        );
        const snap = await getDocs(q);
        setQuests(
          snap.docs.map((d) => ({ ...d.data(), id: d.id } as Quest))
        );
      } catch {
        setError("Failed to load quests. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function cycleQuestStatus(quest: Quest) {
    if (completing || !userDoc || !quest.id) return;
    if (quest.status === "completed") return;

    const questId = quest.id;

    const next =
      quest.status === "pending"
        ? ("active" as const)
        : ("completed" as const);

    if (next === "completed") {
      try {
        setCompleting(questId);
        await runTransaction(db, async (tx) => {
          const qRef = doc(db, "quests", questId);
          const uRef = doc(db, "users", userDoc.displayName ? userDoc.displayName : userDoc.email);
          const qSnap = await tx.get(qRef);
          const uSnap = await tx.get(uRef);
          if (!qSnap.exists() || !uSnap.exists()) throw new Error("Document not found");
          const data = qSnap.data() as Quest;
          if (data.status === "completed") throw new Error("Already completed");
          tx.update(qRef, { status: "completed" });
          tx.update(uRef, { points: uSnap.data().points + data.points });
        });
        setQuests((prev) =>
          prev.map((q) =>
            q.id === questId ? { ...q, status: "completed" as const } : q
          )
        );
        setUserDoc((prev) =>
          prev ? { ...prev, points: prev.points + quest.points } : prev
        );
      } catch {
        setError("Failed to complete quest. Please try again.");
      } finally {
        setCompleting(null);
      }
    } else {
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, status: next } : q
        )
      );
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

  if (!userDoc?.partnerId) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Welcome to Zweisam!</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Share your invite code with your partner to unlock daily quests.
          </p>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <span className="font-mono text-2xl font-bold tracking-widest text-zinc-900 dark:text-white">
              {userDoc?.inviteCode}
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-4 py-5">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Zweisam</h1>
        <Avatar
          src={userDoc?.photoURL}
          name={userDoc?.displayName ?? "User"}
          className="h-8 w-8 rounded-full"
        />
      </header>

      <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-center dark:bg-rose-950/30">
        <span className="text-xs text-rose-700 dark:text-rose-300">Your Points</span>
        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
          {userDoc?.points ?? 0}
        </p>
      </div>

      {quests.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No active quests right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {quests.map((quest) => (
            <button
              key={quest.id}
              onClick={() => cycleQuestStatus(quest)}
              disabled={quest.status === "completed" || completing === quest.id}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left shadow-sm transition-all ${
                quest.status === "completed"
                  ? "border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50"
                  : "border-zinc-100 bg-white hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <h3 className="text-sm font-semibold leading-snug">{quest.title}</h3>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {quest.points} pts
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {quest.schedule}
                </span>
              </div>
              <span
                className={`mt-0.5 text-[10px] font-medium ${
                  quest.status === "completed"
                    ? "text-green-600 dark:text-green-400"
                    : "text-zinc-400"
                }`}
              >
                {quest.status === "completed"
                  ? "✓ Done"
                  : quest.status === "active"
                  ? "Tap to complete"
                  : "Tap to start"}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}