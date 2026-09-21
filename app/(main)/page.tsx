"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import NewQuestModal from "@/components/NewQuestModal";
import QuestCard from "@/components/QuestCard";
import ConfirmModal from "@/components/ConfirmModal";
import type { Quest, QuestSchedule, QuestStatus, User } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

type SortKey = "created" | "points" | "title" | "schedule";

const SCHEDULE_ORDER: Record<QuestSchedule, number> = {
  daily: 0,
  weekly: 1,
  special: 2,
};

function tsMs(x: unknown): number | null {
  if (x instanceof Date) return x.getTime();
  if (x && typeof x === "object" && "toMillis" in x)
    return (x as { toMillis(): number }).toMillis();
  return null;
}

function completionFor(quest: Quest, uid: string | undefined): boolean {
  if (!uid) return false;
  if (quest.completions !== undefined) return uid in quest.completions;
  return quest.completedBy === uid && quest.completedAt != null;
}

function allCompletedMs(quest: Quest): number[] {
  const times: number[] = [];
  if (quest.completions !== undefined) {
    for (const uid in quest.completions) {
      const t = tsMs(quest.completions[uid]);
      if (t !== null) times.push(t);
    }
    return times;
  }
  if (quest.completedBy) {
    const t = tsMs(quest.completedAt);
    if (t !== null) times.push(t);
  }
  return times;
}

function wholeResetMs(quest: Quest): number | null {
  if (quest.schedule !== "daily" && quest.schedule !== "weekly") return null;
  const times = allCompletedMs(quest);
  if (times.length === 0) return null;
  const latest = Math.max(...times);
  const d = new Date(latest);
  d.setHours(24, 0, 0, 0);
  if (quest.schedule === "weekly") {
    while (d.getDay() !== 1) d.setTime(d.getTime() + 86_400_000);
  }
  return d.getTime();
}

function isWholeExpired(quest: Quest, now: number): boolean {
  const reset = wholeResetMs(quest);
  return reset !== null && now >= reset;
}

// Quest is fully complete when every user it targets has completed it.
// For target-less ("both") quests that means both partners.
function questCompleted(
  quest: Quest,
  uid: string | undefined,
  partnerId: string | null | undefined
): boolean {
  const target = quest.target ?? "both";
  if (target === "both")
    return completionFor(quest, uid) && completionFor(quest, partnerId ?? undefined);
  let targetUid = target;
  if (target === "me") targetUid = quest.createdBy;
  if (target === "partner")
    targetUid = uid === quest.createdBy ? partnerId ?? "" : uid ?? "";
  return completionFor(quest, targetUid);
}

// Whether this quest shows as completed for the given viewer: their own box
// is ticked, or (for quests they can't tick) the quest is done by its target.
function viewerDone(
  quest: Quest,
  uid: string | undefined,
  partnerId: string | null | undefined,
  now: number
): boolean {
  if (isWholeExpired(quest, now)) return false;
  if (uid && isEligible(quest, uid, partnerId))
    return completionFor(quest, uid);
  return questCompleted(quest, uid, partnerId);
}

function isEligible(
  quest: Quest,
  uid: string | undefined,
  partnerId: string | null | undefined
): boolean {
  const target = quest.target ?? "both";
  if (target === "both") return true;
  if (!uid) return false;
  if (target === "me") return uid === quest.createdBy;
  if (target === "partner") return partnerId === quest.createdBy;
  return uid === target;
}

function resolveTargetName(
  quest: Quest,
  uid: string | undefined,
  partnerId: string | null | undefined,
  myName: string | undefined,
  partnerName: string | undefined
): string | undefined {
  const target = quest.target ?? "both";
  if (target === "both") return undefined;
  const isMe =
    target === uid ||
    (target === "me" && quest.createdBy === uid) ||
    (target === "partner" && partnerId === quest.createdBy);
  return isMe ? (myName ?? "you") : (partnerName ?? "your partner");
}

export default function HomePage() {
  const { firebaseUser, userDoc, setUserDoc } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [showNewQuest, setShowNewQuest] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [nowMs, setNowMs] = useState(0);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userDoc?.partnerId) {
        setPartnerName(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", userDoc.partnerId));
        if (!cancelled) {
          const p = snap.exists() ? (snap.data() as User) : null;
          setPartnerName(p ? p.nickname || p.displayName : null);
        }
      } catch {
        if (!cancelled) setPartnerName(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userDoc?.partnerId]);

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
        setNowMs(Date.now());
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleQuestStatus(quest: Quest) {
    if (completing || !userDoc || !firebaseUser || !quest.id) return;
    if (!isEligible(quest, firebaseUser.uid, userDoc.partnerId)) return;

    const questId = quest.id;
    const uid = firebaseUser.uid;
    const partnerId = userDoc.partnerId;
    const unchecking = completionFor(quest, uid) && !isWholeExpired(quest, nowMs);

    try {
      setCompleting(questId);
      const completed = await runTransaction(db, async (tx) => {
        const qRef = doc(db, "quests", questId);
        const uRef = doc(db, "users", uid);
        const qSnap = await tx.get(qRef);
        const uSnap = await tx.get(uRef);
        if (!qSnap.exists() || !uSnap.exists()) throw new Error("Document not found");
        const data = qSnap.data() as Quest;

        if (unchecking) {
          if (!completionFor(data, uid) || isWholeExpired(data, nowMs))
            throw new Error("Quest was already reopened");
          tx.update(qRef, {
            [`completions.${uid}`]: deleteField(),
            completedBy: deleteField(),
            completedAt: deleteField(),
            status: "pending",
          });
          tx.update(uRef, { points: uSnap.data().points - data.points });
          return false;
        }
        if (completionFor(data, uid) && !isWholeExpired(data, nowMs))
          throw new Error("Already completed");
        const fullyDone =
          (data.target ?? "both") === "both"
            ? completionFor(data, partnerId ?? undefined)
            : true;
        const completions = { ...(data.completions ?? {}) };
        if (data.completions === undefined && data.completedBy && data.completedAt) {
          completions[data.completedBy] = data.completedAt as Timestamp;
        }
        completions[uid] = serverTimestamp() as unknown as Timestamp;
        tx.update(qRef, {
          completions,
          status: fullyDone ? "completed" : "pending",
        });
        tx.update(uRef, { points: uSnap.data().points + data.points });
        return fullyDone;
      });

      setQuests((prev) =>
        prev.map((q) => {
          if (q.id !== questId) return q;
          if (unchecking) {
            const completions = { ...q.completions };
            delete completions[uid];
            return { ...q, completions, status: "pending" };
          }
          const completions = { ...(q.completions ?? {}) };
          if (q.completions === undefined && q.completedBy && q.completedAt) {
            completions[q.completedBy] = q.completedAt as Timestamp;
          }
          completions[uid] = new Date() as unknown as Timestamp;
          return {
            ...q,
            completions,
            status: completed ? ("completed" as QuestStatus) : "pending",
          };
        })
      );
      setUserDoc((prev) =>
        prev
          ? {
              ...prev,
              points: prev.points + (unchecking ? -quest.points : quest.points),
            }
          : prev
      );
    } catch {
      setError("Failed to update quest. Please try again.");
    } finally {
      setCompleting(null);
    }
  }

  async function confirmDeleteQuest() {
    if (!deleteTarget?.id || deleting || deleteTarget.createdBy !== firebaseUser?.uid)
      return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "quests", deleteTarget.id));
      setQuests((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("Failed to delete quest. Please try again.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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

    const active: Quest[] = [];
    const done: Quest[] = [];
    for (const raw of quests) {
      const q = {
        ...raw,
        status: viewerDone(raw, firebaseUser?.uid, userDoc?.partnerId, nowMs)
          ? "completed"
          : ("pending" as QuestStatus),
      };
      if (q.status === "completed") done.push(q);
      else active.push(q);
    }
    sortQuests(active, sortKey);
    sortQuests(done, sortKey);
    return { activeQuests: active, completedQuests: done };
  }, [quests, sortKey, nowMs, firebaseUser?.uid, userDoc?.partnerId]);

  const partnerLabel = partnerName || undefined;
  const myLabel = userDoc?.nickname || userDoc?.displayName || undefined;

  const cardProps = (quest: Quest) => {
    const uid = firebaseUser?.uid;
    const pid = userDoc?.partnerId;
    const expired = isWholeExpired(quest, nowMs);
    return {
      disabled: completing === quest.id || !isEligible(quest, uid, pid),
      partnerName: partnerLabel,
      targetName: resolveTargetName(
        quest,
        uid,
        pid,
        myLabel,
        partnerLabel
      ),
      myDone: uid !== undefined && !expired && completionFor(quest, uid),
      partnerDone:
        pid !== undefined && !expired && completionFor(quest, pid ?? undefined),
      onDelete:
        quest.createdBy === uid ? () => setDeleteTarget(quest) : undefined,
    };
  };

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
          name={myLabel ?? "User"}
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
              {...cardProps(quest)}
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
                {...cardProps(quest)}
                onToggle={toggleQuestStatus}
              />
            ))}
          </div>
        </section>
      )}

      {showNewQuest && firebaseUser && (
        <NewQuestModal
          creatorUid={firebaseUser.uid}
          creatorName={myLabel ?? "Me"}
          partnerId={userDoc?.partnerId ?? undefined}
          partnerName={partnerLabel}
          onCreated={handleNewQuestCreated}
          onClose={() => setShowNewQuest(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Quest"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteQuest}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}