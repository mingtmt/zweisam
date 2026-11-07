import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

export type CoupleCollection = "quests" | "rewards" | "claims";

/** Deterministic couple id: the two uids sorted and joined with "_". */
export function coupleIdFor(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export function coupleMembers(a: string, b: string): [string, string] {
  const [x, y] = [a, b].sort();
  return [x, y];
}

export function coupleCol(db: Firestore, coupleId: string, name: CoupleCollection) {
  return collection(db, "couples", coupleId, name);
}

export function coupleDoc(
  db: Firestore,
  coupleId: string,
  name: CoupleCollection,
  id: string
) {
  return doc(db, "couples", coupleId, name, id);
}

/**
 * Make sure an already-paired couple has its couple doc and `coupleId` on
 * both user docs (heals pairs made before couples existed).
 */
export async function ensureCouple(db: Firestore, uid: string, partnerId: string) {
  const coupleId = coupleIdFor(uid, partnerId);
  await runTransaction(db, async (tx) => {
    const coupleRef = doc(db, "couples", coupleId);
    const meRef = doc(db, "users", uid);
    const partnerRef = doc(db, "users", partnerId);
    const [coupleSnap, meSnap, partnerSnap] = await Promise.all([
      tx.get(coupleRef),
      tx.get(meRef),
      tx.get(partnerRef),
    ]);
    if (!meSnap.exists() || !partnerSnap.exists()) return;
    if (meSnap.data().partnerId !== partnerId) return;
    if (partnerSnap.data().partnerId !== uid) return;
    if (meSnap.data().coupleId !== coupleId) tx.update(meRef, { coupleId });
    if (partnerSnap.data().coupleId !== coupleId) tx.update(partnerRef, { coupleId });
    if (!coupleSnap.exists()) {
      tx.set(coupleRef, {
        members: coupleMembers(uid, partnerId),
        createdAt: serverTimestamp(),
      });
    }
  });
  return coupleId;
}
