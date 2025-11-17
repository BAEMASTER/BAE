import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseClient";

export async function ackMatch(matchId: string, uid: string) {
  await updateDoc(doc(db, `matches/${matchId}`), { [`acks.${uid}`]: true });
}
