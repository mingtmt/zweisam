// Moves the legacy root `quests` / `rewards` collections into per-couple
// subcollections (couples/{coupleId}/...).
//
// Run BEFORE deploying the new firestore.rules (it uses the client SDK
// without signing in, so it needs the old, open rules):
//   npm run migrate:couples              # dry run, prints what would happen
//   npm run migrate:couples -- --apply   # copy data + link users
//   npm run migrate:couples -- --apply --delete-legacy   # also delete root docs
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APPLY = process.argv.includes("--apply");
const DELETE_LEGACY = process.argv.includes("--delete-legacy");

async function migrate() {
  console.log(APPLY ? "Applying migration…" : "Dry run (pass --apply to write)…");

  // 1. Couples from mutual pairs.
  const usersSnap = await getDocs(collection(db, "users"));
  const coupleOf = new Map<string, string>(); // uid -> coupleId
  for (const u of usersSnap.docs) {
    const partnerId = u.data().partnerId as string | null;
    if (!partnerId || u.id > partnerId) continue;
    const pSnap = await getDoc(doc(db, "users", partnerId));
    if (!pSnap.exists() || pSnap.data().partnerId !== u.id) {
      console.warn(`  ! ${u.id} -> ${partnerId} is not mutual, skipped`);
      continue;
    }
    const members = [u.id, partnerId].sort();
    const coupleId = members.join("_");
    coupleOf.set(u.id, coupleId);
    coupleOf.set(partnerId, coupleId);
    console.log(`  • couple ${coupleId}`);
    if (APPLY) {
      const cRef = doc(db, "couples", coupleId);
      if (!(await getDoc(cRef)).exists()) {
        await setDoc(cRef, { members, createdAt: new Date() });
      }
      await updateDoc(doc(db, "users", u.id), { coupleId });
      await updateDoc(doc(db, "users", partnerId), { coupleId });
    }
  }

  // 2. Quests and rewards.
  for (const name of ["quests", "rewards"] as const) {
    const snap = await getDocs(collection(db, name));
    let moved = 0;
    let skipped = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const coupleId = coupleOf.get(data.createdBy as string);
      if (!coupleId) {
        // seed templates ("__template__") and orphans of unpaired users
        skipped++;
        if (APPLY && DELETE_LEGACY) await deleteDoc(d.ref);
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, status: rewardStatus, ...rest } = data;
      const payload =
        name === "rewards"
          ? { ...rest, maxClaims: data.maxClaims ?? null, claimCount: data.claimCount ?? 0 }
          : { ...rest, status: rewardStatus ?? "pending" };
      moved++;
      console.log(`  • ${name}/${d.id} -> couples/${coupleId}/${name}/${d.id}`);
      if (APPLY) {
        await setDoc(doc(db, "couples", coupleId, name, d.id), payload);
        if (DELETE_LEGACY) await deleteDoc(d.ref);
      }
    }
    console.log(`  ${name}: ${moved} moved, ${skipped} skipped${APPLY && DELETE_LEGACY ? " (legacy deleted)" : ""}`);
  }

  console.log("Done.");
}

migrate().then(
  () => process.exit(0),
  (err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  }
);
