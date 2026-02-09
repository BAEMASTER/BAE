// app/api/match/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { userId, interests, selectedMode } = await req.json();
    const usersCollection = 'users';
    const userRef = db.collection(usersCollection).doc(userId);

    // Issue 6 fix: Check if user is already matched — reject if so
    const currentUser = await userRef.get();
    if (currentUser.exists && currentUser.data()?.status === 'matched') {
      return NextResponse.json(
        { error: "Already in an active match. Leave current match first." },
        { status: 409 }
      );
    }

    // Issue 5 fix: Use a transaction to atomically find and claim a waiting partner
    const result = await db.runTransaction(async (transaction) => {
      // Read own doc first so Firestore tracks it for conflicts.
      // If partner's batch sets us to "matched" concurrently, transaction retries.
      const userSnap = await transaction.get(userRef);
      const currentStatus = userSnap.exists ? userSnap.data()?.status : null;
      if (currentStatus === 'matched' || currentStatus === 'claiming') {
        return { matched: false };
      }

      const queueQuery = await transaction.get(
        db.collection(usersCollection)
          .where("status", "==", "waiting")
          .where("selectedMode", "==", selectedMode)
      );

      // Filter out self AND stale users (no heartbeat in 90s = ghost from closed tab/mobile kill)
      const staleCutoff = Date.now() - 90_000;
      const availableUsers = queueQuery.docs.filter(doc => {
        if (doc.id === userId) return false;
        const data = doc.data();
        const lastActive = data.lastHeartbeat || data.queuedAt;
        if (!lastActive) return false;
        return new Date(lastActive).getTime() > staleCutoff;
      });

      if (availableUsers.length === 0) {
        // No one waiting — enter queue
        const now = new Date().toISOString();
        transaction.set(userRef, {
          status: "waiting",
          selectedMode,
          interests,
          queuedAt: now,
          lastHeartbeat: now,
        }, { merge: true });

        return { matched: false };
      }

      const partnerDoc = availableUsers[Math.floor(Math.random() * availableUsers.length)];
      const partnerId = partnerDoc.id;
      const partnerRef = db.collection(usersCollection).doc(partnerId);

      // Verify partner is still waiting (transaction will retry if doc changed)
      const partnerSnap = await transaction.get(partnerRef);
      if (!partnerSnap.exists || partnerSnap.data()?.status !== 'waiting') {
        // Partner was claimed by another request — enter queue instead
        const nowFallback = new Date().toISOString();
        transaction.set(userRef, {
          status: "waiting",
          selectedMode,
          interests,
          queuedAt: nowFallback,
          lastHeartbeat: nowFallback,
        }, { merge: true });

        return { matched: false };
      }

      // Claim partner inside transaction to prevent double-claiming
      transaction.update(partnerRef, { status: 'claiming' });

      return { matched: true, partnerId };
    });

    if (!result.matched) {
      return NextResponse.json({ matched: false, message: "Waiting for next person..." }, { status: 200 });
    }

    const { partnerId } = result;

    // Create Daily.co room (outside transaction — external API call)
    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `bae-${Date.now()}-${userId.slice(0, 6)}`,
        properties: {
          enable_prejoin_ui: false,
          enable_chat: true,
          enable_screenshare: true,
          start_audio_off: false,
          start_video_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        },
      }),
    });

    const roomData = await roomRes.json();
    if (!roomRes.ok || !roomData.url) {
      // Room creation failed — revert both users to idle so they can retry
      const batch = db.batch();
      batch.set(userRef, { status: "idle" }, { merge: true });
      batch.set(db.collection(usersCollection).doc(partnerId!), { status: "idle" }, { merge: true });
      await batch.commit();
      throw new Error("Daily.co room creation failed");
    }

    const roomUrl = roomData.url;

    // Update both users atomically with match info
    const batch = db.batch();
    batch.set(userRef, {
      status: "matched",
      currentRoomUrl: roomUrl,
      partnerId,
      matchedAt: new Date().toISOString(),
    }, { merge: true });

    batch.set(db.collection(usersCollection).doc(partnerId!), {
      status: "matched",
      currentRoomUrl: roomUrl,
      partnerId: userId,
      matchedAt: new Date().toISOString(),
    }, { merge: true });

    await batch.commit();

    return NextResponse.json({ matched: true, roomUrl, partnerId, autoJoin: true }, { status: 200 });
  } catch (error: any) {
    console.error("Match API error:", error);
    return NextResponse.json({ error: error.message || "Matching failed" }, { status: 500 });
  }
}
