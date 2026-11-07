"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { coupleCol, coupleDoc } from "@/lib/couple";
import { useI18n } from "@/lib/i18n";
import { useCoupleCollection } from "@/lib/hooks/useCoupleCollection";
import { createdMs, tsMs } from "@/lib/quests";
import RewardForm from "@/components/RewardForm";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import {
  Button,
  EmptyState,
  ErrorState,
  PointsPill,
  Segmented,
  SkeletonList,
  cardClass,
} from "@/components/ui";
import type { Claim, Reward } from "@/lib/types";

type Tab = "forMe" | "mine" | "history";
type ConfirmAction = { kind: "claim" | "delete"; reward: Reward };

function remainingOf(r: Reward) {
  return r.maxClaims == null ? null : Math.max(0, r.maxClaims - (r.claimCount ?? 0));
}

export default function StorePage() {
  const { t, formatDateTime } = useI18n();
  const toast = useToast();
  const { firebaseUser, userDoc, partnerDoc, coupleId } = useAuth();
  const rewardsQ = useCoupleCollection<Reward>(coupleId, "rewards");
  const claimsQ = useCoupleCollection<Claim>(coupleId, "claims");
  const [tab, setTab] = useState<Tab>("forMe");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<{ reward?: Reward } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const uid = firebaseUser?.uid;
  const points = userDoc?.points ?? 0;
  const myLabel = userDoc?.nickname || userDoc?.displayName || t("common.you");
  const partnerLabel = partnerDoc?.nickname || partnerDoc?.displayName || t("common.partner");

  const { forMe, mine } = useMemo(() => {
    const sorted = [...rewardsQ.items].sort((a, b) => a.pointCost - b.pointCost || createdMs(a) - createdMs(b));
    return {
      forMe: sorted.filter((r) => r.createdBy !== uid),
      mine: sorted.filter((r) => r.createdBy === uid),
    };
  }, [rewardsQ.items, uid]);

  const claims = useMemo(
    () => [...claimsQ.items].sort((a, b) => (tsMs(b.claimedAt) ?? Infinity) - (tsMs(a.claimedAt) ?? Infinity)),
    [claimsQ.items]
  );
  const toGive = claims.filter((c) => c.rewardOwner === uid && !c.fulfilledAt).length;

  async function claimReward(reward: Reward) {
    if (busyId || !uid || !coupleId || !reward.id) return;
    const rewardId = reward.id;
    setBusyId(rewardId);
    try {
      await runTransaction(db, async (tx) => {
        const uRef = doc(db, "users", uid);
        const rRef = coupleDoc(db, coupleId, "rewards", rewardId);
        const [uSnap, rSnap] = await Promise.all([tx.get(uRef), tx.get(rRef)]);
        if (!uSnap.exists() || !rSnap.exists()) throw new Error("not-found");
        const r = rSnap.data() as Reward;
        const balance: number = uSnap.data().points ?? 0;
        const count = r.claimCount ?? 0;
        if (r.createdBy === uid) throw new Error("own-reward");
        if (balance < r.pointCost) throw new Error("insufficient-points");
        if (r.maxClaims != null && count >= r.maxClaims) throw new Error("sold-out");

        tx.update(uRef, { points: balance - r.pointCost });
        tx.update(rRef, { claimCount: count + 1 });
        tx.set(doc(coupleCol(db, coupleId, "claims")), {
          rewardId,
          rewardTitle: r.title,
          pointCost: r.pointCost,
          claimedBy: uid,
          rewardOwner: r.createdBy,
          claimedAt: serverTimestamp(),
          fulfilledAt: null,
        });
      });
      toast(t("store.claimed", { title: reward.title, name: partnerLabel }), "success");
    } catch (e) {
      console.error(e);
      toast(t("store.claimFailed"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReward(reward: Reward) {
    if (busyId || !coupleId || !reward.id) return;
    setBusyId(reward.id);
    try {
      await deleteDoc(coupleDoc(db, coupleId, "rewards", reward.id));
    } catch (e) {
      console.error(e);
      toast(t("store.deleteFailed"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function markFulfilled(claim: Claim) {
    if (!coupleId || !claim.id) return;
    try {
      await updateDoc(coupleDoc(db, coupleId, "claims", claim.id), { fulfilledAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      toast(t("store.history.fulfillFailed"), "error");
    }
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "claim") claimReward(confirm.reward);
    else deleteReward(confirm.reward);
    setConfirm(null);
  }

  const renderReward = (reward: Reward, owned: boolean) => {
    const left = remainingOf(reward);
    const soldOut = left === 0;
    const canAfford = points >= reward.pointCost;
    return (
      <div key={reward.id} className={`${cardClass} p-4 ${soldOut ? "opacity-55" : ""}`}>
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="font-extrabold leading-snug">{reward.title}</h3>
          <PointsPill className="shrink-0">{reward.pointCost}</PointsPill>
        </div>
        {reward.description && <p className="mb-2 text-sm text-muted">{reward.description}</p>}
        <p className="mb-3 text-xs font-bold text-muted">
          {left === null ? `♾️ ${t("store.unlimited")}` : t("store.remaining", { left, max: reward.maxClaims ?? 0 })}
          {(reward.claimCount ?? 0) > 0 && ` · ${t("store.claimedTimes", { n: reward.claimCount })}`}
        </p>
        {owned ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setForm({ reward })} disabled={busyId === reward.id}>
              {t("common.edit")}
            </Button>
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger-soft"
              onClick={() => setConfirm({ kind: "delete", reward })}
              disabled={busyId === reward.id}
            >
              {t("common.delete")}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={() => setConfirm({ kind: "claim", reward })}
            disabled={soldOut || !canAfford || busyId === reward.id}
          >
            {soldOut ? t("store.soldOut") : canAfford ? t("store.claim") : t("store.notEnough")}
          </Button>
        )}
      </div>
    );
  };

  const loading = !coupleId || rewardsQ.loading || claimsQ.loading;
  const error = rewardsQ.error || claimsQ.error;

  return (
    <main className="mx-auto min-h-full max-w-md px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t("store.title")} 🎁</h1>
        <PointsPill className="px-3 py-1 text-sm">{points}</PointsPill>
      </header>

      <div className="mb-4">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "forMe", label: t("store.tab.forMe") },
            { value: "mine", label: t("store.tab.mine") },
            {
              value: "history",
              label: (
                <span className="inline-flex items-center gap-1">
                  {t("store.tab.history")}
                  {toGive > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-on-accent">
                      {toGive}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>

      {tab === "mine" && (
        <Button className="mb-4 w-full" onClick={() => setForm({})} disabled={!coupleId}>
          <span className="text-lg leading-none">＋</span> {t("store.newReward")}
        </Button>
      )}

      {error ? (
        <ErrorState message={t("common.loadError")} retryLabel={t("common.retry")} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <SkeletonList />
      ) : tab === "forMe" ? (
        forMe.length === 0 ? (
          <EmptyState emoji="🎀">{t("store.emptyForMe", { name: partnerLabel })}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">{forMe.map((r) => renderReward(r, false))}</div>
        )
      ) : tab === "mine" ? (
        mine.length === 0 ? (
          <EmptyState emoji="🎁">{t("store.emptyMine", { name: partnerLabel })}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">{mine.map((r) => renderReward(r, true))}</div>
        )
      ) : claims.length === 0 ? (
        <EmptyState emoji="📜">{t("store.emptyHistory")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {claims.map((c) => {
            const iOwe = c.rewardOwner === uid;
            const when = tsMs(c.claimedAt);
            return (
              <li key={c.id} className={`${cardClass} flex items-center gap-3 p-3.5`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg" aria-hidden="true">
                  {c.fulfilledAt ? "💝" : "🎁"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{c.rewardTitle}</p>
                  <p className="text-xs text-muted">
                    {t("store.history.claimed", { who: c.claimedBy === uid ? myLabel : partnerLabel })}
                    {" · "}
                    {t("common.points", { n: c.pointCost })}
                    {when !== null && ` · ${formatDateTime(when)}`}
                  </p>
                </div>
                {c.fulfilledAt ? (
                  <span className="rounded-full bg-mint-soft px-2.5 py-1 text-xs font-bold text-mint">
                    {t("store.history.fulfilled")}
                  </span>
                ) : iOwe ? (
                  <Button className="min-h-9 px-3 text-xs" onClick={() => markFulfilled(c)}>
                    {t("store.history.markFulfilled")}
                  </Button>
                ) : (
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">
                    {t("store.history.pending")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form && uid && coupleId && (
        <RewardForm coupleId={coupleId} creatorUid={uid} initial={form.reward} onClose={() => setForm(null)} />
      )}

      {confirm && (
        <ConfirmModal
          title={t(confirm.kind === "claim" ? "store.claimTitle" : "store.deleteTitle")}
          message={
            confirm.kind === "claim"
              ? t("store.claimMessage", { cost: confirm.reward.pointCost, title: confirm.reward.title })
              : t("store.deleteMessage", { title: confirm.reward.title })
          }
          confirmLabel={
            confirm.kind === "claim" ? t("store.claimConfirm", { cost: confirm.reward.pointCost }) : t("common.delete")
          }
          danger={confirm.kind === "delete"}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </main>
  );
}
