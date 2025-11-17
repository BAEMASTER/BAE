// app/api/match/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { userId, interests, selectedMode } = await req.json();
    const appId = "SO-INTERESTING";
    const usersRef = db.collection(`artifacts/${appId}/users`);

    return await db.runTransaction(async (transaction) => {
      // 1. Get ALL waiting users in this mode (excluding self)
      const waitingSnap = await transaction.get(
        usersRef
          .where("status", "==", "waiting")
          .where("selectedMode", "==", selectedMode)
      );

      const waitingUsers = waitingSnap.docs.filter(doc => doc.id !== userId);

      if (waitingUsers.length === 0) {
        // You're the FIRST → enter queue
        const userRef = db.doc(`artifacts/${appId}/users/${userId}/profile/main`);
        transaction.set(
          userRef,
          {
            status: "waiting",
            interests,
            selectedMode,
            queuedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        return NextResponse.json(
          { message: "Waiting for next person..." },
          { status: 200 }
        );
      }

      // 2. You're the SECOND → MATCH with the FIRST in line
      const partnerDoc = waitingUsers[0]; // ← FIFO: first waiting user
      const partnerId = partnerDoc.id;

      // Create Daily.co room
      const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `bae-${userId}-${partnerId}`,
          properties: {
            enable_prejoin_ui: true,
            enable_screenshare: true,
            lang: "en",
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
          },
        }),
      });

      const roomData = await roomResponse.json();
      if (!roomData.url) throw new Error("Failed to create room");
      const roomUrl = roomData.url;

      // 3. Update both users
      const userRef = db.doc(`artifacts/${appId}/users/${userId}/profile/main`);
      const partnerRef = db.doc(`artifacts/${appId}/users/${partnerId}/profile/main`);

      transaction.update(userRef, {
        status: "matched",
        currentRoomUrl: roomUrl,
        partnerId,
        matchedAt: new Date().toISOString(),
      });

      transaction.update(partnerRef, {
        status: "matched",
        currentRoomUrl: roomUrl,
        partnerId: userId,
        matchedAt: new Date().toISOString(),
      });

      // 4. Auto-join
      return NextResponse.json({
        matched: true,
        roomUrl,
        partnerId,
        autoJoin: true,
      });
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}