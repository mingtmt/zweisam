"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import NewQuestModal from "@/components/NewQuestModal";
import QuestCard from "@/components/QuestCard";
import type { Quest, QuestSchedule, QuestStatus } from "@/lib/types";

type SortKey = "created" | "points" | "title" | "schedule";

const SCHEDULE_ORDER: Record<QuestSchedule, number> = {
  daily: 0,
  weekly: 1,
  special: 2,
};

export default function HomePage() {
  const { firebaseUser, userDoc, setUserDoc } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [showNewQuest, setShowNewQuest] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created");

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

  async function toggleQuestStatus(quest: Quest) {
    if (completing || !userDoc || !firebaseUser || !quest.id) return;

    const questId = quest.id;
    const isCompleted = quest.status === "completed";

    try {
      setCompleting(questId);
      await runTransaction(db, async (tx) => {
        const qRef = doc(db, "quests", questId);
        const uRef = doc(db, "users", firebaseUser.uid);
        const qSnap = await tx.get(qRef);
        const uSnap = await tx.get(uRef);
        if (!qSnap.exists() || !uSnap.exists()) throw new Error("Document not found");
        const data = qSnap.data() as Quest;

        if (isCompleted) {
          if (data.status !== "completed")
            throw new Error("Quest was already reopened");
          tx.update(qRef, { status: "active" });
          tx.update(uRef, { points: uSnap.data().points - data.points });
        } else {
          if (data.status === "completed")
            throw new Error("Already completed");
          tx.update(qRef, { status: "completed" });
          tx.update(uRef, { points: uSnap.data().points + data.points });
        }
      });

      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId
            ? {
                ...q,
                status: (isCompleted ? "active" : "completed") as QuestStatus,
              }
            : q
        )
      );
      setUserDoc((prev) =>
        prev
          ? {
              ...prev,
              points: prev.points + (isCompleted ? -quest.points : quest.points),
            }
          : prev
      );
    } catch {
      setError("Failed to update quest. Please try again.");
    } finally {
      setCompleting(null);
    }
  }

  function handleNewQuestCreated(quest: Quest) {
    setQuests((prev) => [quest, ...prev]);
  }

  function createdMs(quest: Quest): number {
    const c: unknown = quest.createdAt;
    if (c instanceof Date) return c.getTime();
    if (c && typeof c === "object" && "toMillis" in c)
      return (c as { toMillis(): number }).toMillis();
    return Number.MAX_SAFE_INTEGER;
  }

  const { activeQuests, completedQuests } = useMemo(() => {
    const sortQuests = (list: Quest[], key: SortKey) => {
      switch (key) {
        case "points":
          list.sort((a, b) => b.points - a.points);
          break;
        case "title":
          list.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "schedule":
          list.sort(
            (a, b) =>
              SCHEDULE_ORDER[a.schedule] - SCHEDULE_ORDER[b.schedule] ||
              b.points - a.points
          );
          break;
        default:
          list.sort((a, b) => createdMs(b) - createdMs(a));
      }
    };

    const active = quests.filter((q) => q.status !== "completed");
    const done = quests.filter((q) => q.status === "completed");
    sortQuests(active, sortKey);
    sortQuests(done, sortKey);
    return { activeQuests: active, completedQuests: done };
  }, [quests, sortKey]);

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

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">Sort quests</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium outline-none transition-colors focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="created">Newest</option>
          <option value="points">Points</option>
          <option value="title">A → Z</option>
          <option value="schedule">Schedule</option>
        </select>
      </div>

      <button
        onClick={() => setShowNewQuest(true)}
        className="mb-4 w-full rounded-xl border-2 border-dashed border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/20"
      >
        ＋ New Quest
      </button>

      {activeQuests.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">
            No active quests right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              disabled={completing === quest.id}
              onToggle={toggleQuestStatus}
            />
          ))}
        </div>
      )}

      {completedQuests.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Completed ({completedQuests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {completedQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                disabled={completing === quest.id}
                onToggle={toggleQuestStatus}
              />
            ))}
          </div>
        </section>
      )}

      {showNewQuest && firebaseUser && (
        <NewQuestModal
          creatorUid={firebaseUser.uid}
          onCreated={handleNewQuestCreated}
          onClose={() => setShowNewQuest(false)}
        />
      )}
    </main>
  );
}