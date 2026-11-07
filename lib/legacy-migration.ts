import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { coupleDoc } from "@/lib/couple";

/**
 * One-time move of the signed-in user's own docs from the legacy root
 * `quests` / `rewards` collections into couples/{coupleId}/... .
 * Each partner moves the docs they created (that's all the rules allow).
 * Safe to call repeatedly: it only finds docs that are still at the root.
 */
export async function migrateLegacyData(uid: string, coupleId: string) {
  let moved = 0;
  for (const name of ["quests", "rewards"] as const) {
    const snap = await getDocs(query(collection(db, name), where("createdBy", "==", uid)));
    for (const d of snap.docs) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, ...data } = d.data();
      let payload: Record<string, unknown> = data;
      if (name === "rewards") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { status, ...rest } = data;
        payload = { ...rest, maxClaims: data.maxClaims ?? null, claimCount: 0 };
      }
      const batch = writeBatch(db);
      batch.set(coupleDoc(db, coupleId, name, d.id), payload);
      batch.delete(d.ref);
      await batch.commit();
      moved++;
    }
  }
  return moved;
}
