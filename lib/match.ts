// lib/match.ts
import { auth, db } from "./firebaseClient"; // note lowercase 'c' if that’s your file
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export async function enqueueForMatch(topic: string) {
  let user = auth.currentUser;
  if (!user) {
    await signInWithPopup(auth, new GoogleAuthProvider());
    user = auth.currentUser;
  }
  if (!user) throw new Error("Sign-in required");

  const uid = user.uid;
  const ref = doc(db, `queues/${topic}/waiting/${uid}`);
  await setDoc(ref, { ready: true, createdAt: serverTimestamp() }, { merge: true });
  return { uid };
}
