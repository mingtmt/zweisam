import type { Quest, QuestSchedule } from "@/lib/types";

export const SCHEDULE_ORDER: Record<QuestSchedule, number> = {
  daily: 0,
  weekly: 1,
  special: 2,
};

export function tsMs(x: unknown): number | null {
  if (x instanceof Date) return x.getTime();
  if (x && typeof x === "object" && "toMillis" in x)
    return (x as { toMillis(): number }).toMillis();
  return null;
}

export function createdMs(quest: { createdAt?: unknown }): number {
  return tsMs(quest.createdAt) ?? Number.MAX_SAFE_INTEGER;
}

export function completionFor(quest: Quest, uid: string | null | undefined): boolean {
  if (!uid) return false;
  if (quest.completions !== undefined) return uid in quest.completions;
  return quest.completedBy === uid && quest.completedAt != null;
}

export function allCompletedMs(quest: Quest): number[] {
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

/** When a daily/weekly quest reopens: next local midnight / next Monday. */
export function wholeResetMs(quest: Quest): number | null {
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

export function isWholeExpired(quest: Quest, now: number): boolean {
  const reset = wholeResetMs(quest);
  return reset !== null && now >= reset;
}

/**
 * Quest is fully complete when every user it targets has completed it.
 * For target-less ("both") quests that means both partners.
 */
export function questCompleted(
  quest: Quest,
  uid: string | null | undefined,
  partnerId: string | null | undefined
): boolean {
  const target = quest.target ?? "both";
  if (target === "both") return completionFor(quest, uid) && completionFor(quest, partnerId);
  let targetUid = target;
  if (target === "me") targetUid = quest.createdBy;
  if (target === "partner") targetUid = uid === quest.createdBy ? partnerId ?? "" : uid ?? "";
  return completionFor(quest, targetUid);
}

export function isEligible(
  quest: Quest,
  uid: string | null | undefined,
  partnerId: string | null | undefined
): boolean {
  const target = quest.target ?? "both";
  if (target === "both") return true;
  if (!uid) return false;
  if (target === "me") return uid === quest.createdBy;
  if (target === "partner") return partnerId === quest.createdBy;
  return uid === target;
}

/**
 * Whether this quest shows as completed for the viewer: their own box is
 * ticked, or (for quests they can't tick) the quest is done by its target.
 */
export function viewerDone(
  quest: Quest,
  uid: string | null | undefined,
  partnerId: string | null | undefined,
  now: number
): boolean {
  if (isWholeExpired(quest, now)) return false;
  if (uid && isEligible(quest, uid, partnerId)) return completionFor(quest, uid);
  return questCompleted(quest, uid, partnerId);
}

/** Whether the quest is targeted at the viewer (`true`), the partner (`false`) or both (`null`). */
export function targetIsViewer(
  quest: Quest,
  uid: string | null | undefined,
  partnerId: string | null | undefined
): boolean | null {
  const target = quest.target ?? "both";
  if (target === "both") return null;
  return (
    target === uid ||
    (target === "me" && quest.createdBy === uid) ||
    (target === "partner" && partnerId === quest.createdBy)
  );
}
