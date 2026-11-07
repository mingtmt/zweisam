"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { coupleDoc } from "@/lib/couple";
import { useI18n } from "@/lib/i18n";
import { useCoupleCollection } from "@/lib/hooks/useCoupleCollection";
import {
  SCHEDULE_ORDER,
  completionFor,
  createdMs,
  isEligible,
  isWholeExpired,
  targetIsViewer,
  viewerDone,
} from "@/lib/quests";
import { toggleQuestCompletion } from "@/lib/quest-actions";
import Avatar from "@/components/Avatar";
import QuestForm from "@/components/QuestForm";
import QuestCard from "@/components/QuestCard";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { Button, EmptyState, ErrorState, SkeletonList, cardClass } from "@/components/ui";
import type { Quest, QuestStatus } from "@/lib/types";

type SortKey = "created" | "points" | "title" | "schedule";
const SORT_KEYS: SortKey[] = ["created", "points", "title", "schedule"];

function sortQuests(list: Quest[], key: SortKey) {
  switch (key) {
    case "points":
      return list.sort((a, b) => b.points - a.points);
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "schedule":
      return list.sort(
        (a, b) => SCHEDULE_ORDER[a.schedule] - SCHEDULE_ORDER[b.schedule] || b.points - a.points
      );
    default:
      return list.sort((a, b) => createdMs(b) - createdMs(a));
  }
}

export default function HomePage() {
  const { t } = useI18n();
  const toast = useToast();
  const { firebaseUser, userDoc, partnerDoc, coupleId } = useAuth();
  const { items: quests, loading, error } = useCoupleCollection<Quest>(coupleId, "quests");
  const [completing, setCompleting] = useState<string | null>(null);
  const [form, setForm] = useState<{ quest?: Quest } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [burst, setBurst] = useState<{ questId: string; delta: number; key: number } | null>(null);
  const burstKey = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const uid = firebaseUser?.uid;
  const partnerId = userDoc?.partnerId ?? null;
  const myLabel = userDoc?.nickname || userDoc?.displayName || t("common.you");
  const partnerLabel = partnerDoc?.nickname || partnerDoc?.displayName || t("common.partner");

  async function toggleQuestStatus(quest: Quest) {
    if (completing || !uid || !coupleId || !quest.id) return;
    if (!isEligible(quest, uid, partnerId)) return;
    const questId = quest.id;
    setCompleting(questId);
    try {
      const now = Date.now();
      setNowMs(now);
      const delta = await toggleQuestCompletion({ coupleId, questId, uid, partnerId, now });
      if (delta > 0) setBurst({ questId, delta, key: ++burstKey.current });
    } catch (e) {
      console.error(e);
      toast(t("home.updateFailed"), "error");
    } finally {
      setCompleting(null);
    }
  }

  async function confirmDeleteQuest() {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target?.id || !coupleId || target.createdBy !== uid) return;
    try {
      await deleteDoc(coupleDoc(db, coupleId, "quests", target.id));
    } catch (e) {
      console.error(e);
      toast(t("home.deleteFailed"), "error");
    }
  }

  const { activeQuests, completedQuests } = useMemo(() => {
    const active: Quest[] = [];
    const done: Quest[] = [];
    for (const raw of quests) {
      if (raw.active === false) continue;
      const q = {
        ...raw,
        status: viewerDone(raw, uid, partnerId, nowMs) ? "completed" : ("pending" as QuestStatus),
      };
      (q.status === "completed" ? done : active).push(q);
    }
    return {
      activeQuests: sortQuests(active, sortKey),
      completedQuests: sortQuests(done, sortKey),
    };
  }, [quests, sortKey, nowMs, uid, partnerId]);

  const renderCard = (quest: Quest) => {
    const expired = isWholeExpired(quest, nowMs);
    const forViewer = targetIsViewer(quest, uid, partnerId);
    const mine = quest.createdBy === uid;
    return (
      <QuestCard
        key={quest.id}
        quest={quest}
        onToggle={toggleQuestStatus}
        disabled={completing === quest.id || !isEligible(quest, uid, partnerId)}
        partnerName={partnerLabel}
        targetName={forViewer === null ? undefined : forViewer ? myLabel : partnerLabel}
        myDone={!expired && completionFor(quest, uid)}
        partnerDone={!expired && completionFor(quest, partnerId)}
        onEdit={mine ? (q) => setForm({ quest: q }) : undefined}
        onDelete={mine ? setDeleteTarget : undefined}
        burst={burst?.questId === quest.id ? burst : null}
      />
    );
  };

  if (!partnerId) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-10">
        <div className={`${cardClass} flex w-full flex-col items-center gap-4 p-7 text-center`}>
          <span className="text-5xl" aria-hidden="true">💌</span>
          <h2 className="text-xl font-extrabold">{t("home.welcomeTitle")}</h2>
          <p className="text-sm text-muted">{t("home.welcomeBody")}</p>
          <div className="rounded-2xl bg-soft px-6 py-3">
            <span className="font-mono text-2xl font-black tracking-[0.3em]">{userDoc?.inviteCode}</span>
          </div>
          <Link
            href="/profile"
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 text-sm font-bold text-on-accent transition hover:bg-accent-strong active:scale-[0.98]"
          >
            {t("home.goProfile")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-4">
        <h1 className="text-2xl font-black">{t("home.greeting", { name: myLabel })} 👋</h1>
        <p className="text-sm text-muted">{t("home.subtitle")}</p>
      </header>

      <div className="mb-5 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-accent-soft to-gold-soft p-4">
        <div className="flex flex-1 items-center gap-2.5">
          <Avatar src={userDoc?.photoURL} name={myLabel} className="h-10 w-10 rounded-full ring-2 ring-card" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-muted">{myLabel}</p>
            <p className="text-xl font-black text-accent">{userDoc?.points ?? 0}</p>
          </div>
        </div>
        <span className="text-xl" aria-hidden="true">💞</span>
        <div className="flex flex-1 flex-row-reverse items-center gap-2.5 text-right">
          <Avatar src={partnerDoc?.photoURL} name={partnerLabel} className="h-10 w-10 rounded-full ring-2 ring-card" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-muted">{partnerLabel}</p>
            <p className="text-xl font-black text-accent">{partnerDoc?.points ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Button className="flex-1" onClick={() => setForm({})} disabled={!coupleId}>
          <span className="text-lg leading-none">＋</span> {t("home.newQuest")}
        </Button>
        <label className="sr-only" htmlFor="quest-sort">
          {t("home.sortLabel")}
        </label>
        <select
          id="quest-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="min-h-11 rounded-2xl border border-line bg-card px-3 text-sm font-bold text-muted outline-none focus:border-accent"
        >
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`home.sort.${k}`)}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={t("common.loadError")} retryLabel={t("common.retry")} onRetry={() => window.location.reload()} />
      ) : !coupleId || loading ? (
        <SkeletonList />
      ) : activeQuests.length === 0 && completedQuests.length === 0 ? (
        <EmptyState emoji="🌱">{t("home.empty")}</EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-3">{activeQuests.map(renderCard)}</div>
          {completedQuests.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted">
                {t("home.completed", { n: completedQuests.length })}
              </h2>
              <div className="flex flex-col gap-3">{completedQuests.map(renderCard)}</div>
            </section>
          )}
        </>
      )}

      {form && uid && coupleId && (
        <QuestForm
          coupleId={coupleId}
          creatorUid={uid}
          creatorName={myLabel}
          partnerId={partnerId}
          partnerName={partnerLabel}
          initial={form.quest}
          onClose={() => setForm(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={t("home.deleteTitle")}
          message={t("home.deleteMessage", { title: deleteTarget.title })}
          confirmLabel={t("common.delete")}
          danger
          onConfirm={confirmDeleteQuest}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
