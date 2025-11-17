// C:\Users\jrotm\so-interesting\lib\usematch.ts
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebaseClient";

export function useMatch(uid?: string | null) {
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;

    // ✅ new top-level doc path (even number of segments)
    const stateRef = doc(db, `userStates/${uid}`);

    const stopState = onSnapshot(stateRef, (s) => {
      const id = s.data()?.activeMatchId;
      if (!id) return setMatch(null);

      const mRef = doc(db, `matches/${id}`);
      const stopMatch = onSnapshot(mRef, (m) =>
        setMatch({ id, ...m.data() })
      );
      return () => stopMatch();
    });

    return () => stopState();
  }, [uid]);

  return match;
}
