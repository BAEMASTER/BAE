import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebaseClient";

/**
 * Adds the current user to the waiting queue for a given interest.
 * This triggers the Cloud Function when a matching partner joins.
 */
export async function enqueue(uid: string, interest: string) {
  await setDoc(doc(db, `queues/${interest}/waiting/${uid}`), {
    uid,
    interest,
    queuedAt: serverTimestamp(),
  });
}
