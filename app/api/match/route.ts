'use client';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { userId, interests, selectedMode } = await req.json();
    const appId = "SO-INTERESTING";
    const usersRef = db.collection(`artifacts/${appId}/users`);

    // ✅ Prevent build-time or bad calls from hitting Daily.co without a real API key
    if (!process.env.DAILY_API_KEY) {
      console.error("❌ Missing DAILY API key in environment");
      return NextResponse.json({ error: "Missing Daily API key" }, { status: 500 });
    }

    return await db.runTransaction(async (transaction) => {
      // 1. Get ALL users who are waiting in same mode, excluding self
      const waitingSnap = await transaction.get(
        usersRef
          .where("status", "==", "waiting")
          .where("selectedMode", "==", selectedMode)
      );

      const waitingUsers = waitingSnap.docs.filter(doc => doc.id !== userId);

      // If nobody else is waiting — put this user in queue
      if (waitingUsers.length === 0) {
        const userProfileRef = db.doc(`artifacts/${appId}/users/${userId}/profile`);

        transaction.set(
          userProfileRef,
          {
            status: "waiting",
            interests,
            selectedMode,
            queuedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log("⏳ Entered queue as first user:", userId);
        return NextResponse.json({ message: "Waiting for next person..." }, { status: 200 });
      }

      // 2. MATCH with the first waiting user
      const partnerId = waitingUsers[0].id;

      // 3. Create Daily.co room at runtime only
      const roomRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `bae-${userId}-${partnerId}`,
          properties: {
            enable_prejoin_ui: true,
            enable_chat: true,
            enable_screenshare: true,
            start_audio_off: false,
            start_video_off: false,
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
          },
        }),
      });

      const roomData = await roomRes.json();
      if (!roomRes.ok || !roomData.url) {
        console.error("❌ Daily.co room creation failed:", roomData);
        throw new Error("Daily.co room creation failed");
      }

      const roomUrl = roomData.url;
      console.log("🫶 Matched users in room:", roomUrl);

      // 4. Update Firestore docs for both users
      const myRef = db.doc(`artifacts/${appId}/users/${userId}/profile`);
      const theirRef = db.doc(`artifacts/${appId}/users/${partnerId}/profile`);

      transaction.update(myRef, {
        status: "matched",
        currentRoomUrl: roomUrl,
        partnerId,
        matchedAt: new Date().toISOString(),
      });

      transaction.update(theirRef, {
        status: "matched",
        currentRoomUrl: roomUrl,
        partnerId: userId,
        matchedAt: new Date().toISOString(),
      });

      console.log("✅ Firestore updated for both users. Launching room.");

      // 5. Return room join payload
      return NextResponse.json({
        matched: true,
        roomUrl,
        partnerId,
        autoJoin: true,
      });
    });

  } catch (error: any) {
    console.error("🔥 Match API error:", error);
    return NextResponse.json({ error: error.message || "Matching failed" }, { status: 500 });
  }
}
