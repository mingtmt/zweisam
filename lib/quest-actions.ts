import {
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { coupleDoc } from "@/lib/couple";
import { completionFor, isEligible, isOverdue, isWholeExpired } from "@/lib/quests";
import type { Quest } from "@/lib/types";

/**
 * Tick or untick the viewer's completion of a quest, adjusting their points
 * in the same transaction. Returns the points delta that was applied.
 */
export async function toggleQuestCompletion(opts: {
  coupleId: string;
  questId: string;
  uid: string;
  partnerId: string | null;
  now: number;
}): Promise<number> {
  const { coupleId, questId, uid, partnerId, now } = opts;
  return runTransaction(db, async (tx) => {
    const qRef = coupleDoc(db, coupleId, "quests", questId);
    const uRef = doc(db, "users", uid);
    const qSnap = await tx.get(qRef);
    const uSnap = await tx.get(uRef);
    if (!qSnap.exists() || !uSnap.exists()) throw new Error("not-found");
    const data = qSnap.data() as Quest;
    if (!isEligible(data, uid, partnerId)) throw new Error("not-eligible");
    // Past its date and not done: closed for good (the creator can move the date).
    if (isOverdue(data, uid, partnerId, now)) throw new Error("overdue");
    const points: number = uSnap.data().points ?? 0;
    const expired = isWholeExpired(data, now);

    if (completionFor(data, uid) && !expired) {
      // Refund what was actually awarded, not the (possibly edited) current value.
      const refund = data.awarded?.[uid] ?? data.points;
      tx.update(qRef, {
        [`completions.${uid}`]: deleteField(),
        [`awarded.${uid}`]: deleteField(),
        completedBy: deleteField(),
        completedAt: deleteField(),
        status: "pending",
      });
      tx.update(uRef, { points: Math.max(0, points - refund) });
      return -Math.min(points, refund);
    }

    // Start a fresh round once the previous one has expired.
    const completions: Record<string, Timestamp> = expired
      ? {}
      : { ...(data.completions ?? {}) };
    if (!expired && data.completions === undefined && data.completedBy && data.completedAt) {
      completions[data.completedBy] = data.completedAt as Timestamp;
    }
    completions[uid] = serverTimestamp() as unknown as Timestamp;
    const awarded: Record<string, number> = expired ? {} : { ...(data.awarded ?? {}) };
    awarded[uid] = data.points;
    const fullyDone =
      (data.target ?? "both") === "both" ? !!partnerId && partnerId in completions : true;
    tx.update(qRef, {
      completions,
      awarded,
      completedBy: deleteField(),
      completedAt: deleteField(),
      status: fullyDone ? "completed" : "pending",
    });
    tx.update(uRef, { points: points + data.points });
    return data.points;
  });
}
