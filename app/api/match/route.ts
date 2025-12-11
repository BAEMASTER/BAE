// app/api/match/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { userId, interests, selectedMode } = await req.json();
    const usersCollection = 'users';

    // Make a reference to the queue collection
    const queueQuery = await db.collection(usersCollection)
      .where("status", "==", "waiting")
      .where("selectedMode", "==", selectedMode)
      .get();

    const waitingUsers = queueQuery.docs.filter(doc => doc.id !== userId);

    // 🧍 YOU ARE FIRST — enter queue
    if (waitingUsers.length === 0) {
      await db.collection(usersCollection).doc(userId).set(
        {
          status: "waiting",
          selectedMode,
          interests,
          queuedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return NextResponse.json({ matched: false, message: "Waiting for next person..." }, { status: 200 });
    }

    // 💞 YOU ARE SECOND — match with first waiting user
    const partnerId = waitingUsers[0].id;

    // ✅ Create Daily.co room
    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `bae-${userId}-${partnerId}`,
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
      throw new Error("Daily.co room creation failed");
    }

    const roomUrl = roomData.url;

    // ✅ FIXED: Use set with merge instead of update
    await db.collection(usersCollection).doc(userId).set({
      status: "matched",
      currentRoomUrl: roomUrl,
      partnerId,
      matchedAt: new Date().toISOString(),
    }, { merge: true });

    await db.collection(usersCollection).doc(partnerId).set({
      status: "matched",
      currentRoomUrl: roomUrl,
      partnerId: userId,
      matchedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ matched: true, roomUrl, partnerId, autoJoin: true }, { status: 200 });

  } catch (error: any) {
    console.error("Match API error:", error);
    return NextResponse.json({ error: error.message || "Matching failed" }, { status: 500 });
  }
}