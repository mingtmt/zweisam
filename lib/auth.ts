import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { db, auth } from "./firebase";
import type { Locale } from "./types";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(locale: Locale = "vi") {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const code = generateCode();
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      partnerId: null,
      coupleId: null,
      locale,
      inviteCode: code,
      points: 0,
      createdAt: serverTimestamp(),
    });
  }

  return user;
}

export function logOut() {
  return signOut(auth);
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
