import { initializeApp } from "firebase/app";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
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

async function migrate() {
  const usersSnap = await getDocs(collection(db, "users"));
  let moved = 0;
  let removed = 0;
  let skipped = 0;

  for (const snap of usersSnap.docs) {
    const data = snap.data();
    const old = data.partnerNickname as unknown;
    if (old === undefined) {
      skipped++;
      continue;
    }

    const partnerId = data.partnerId as string | null | undefined;
    if (typeof old === "string" && old.trim() && partnerId) {
      const pSnap = await getDoc(doc(db, "users", partnerId));
      if (pSnap.exists() && !pSnap.data().nickname) {
        await updateDoc(pSnap.ref, { nickname: old.trim() });
        moved++;
      }
    }

    await updateDoc(snap.ref, { partnerNickname: deleteField() });
    removed++;
    console.log(`  • ${snap.id}: ${old === "" ? "(empty)" : `"${old}"`} moved`);
  }

  console.log(
    `Migration done: ${moved} nicknames moved, ${removed} legacy fields removed, ${skipped} docs untouched.`
  );
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});