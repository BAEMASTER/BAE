import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// POST /api/direct-call — initiate a call (creates a ringing record)
export async function POST(req: NextRequest) {
  try {
    const { ownerUid, visitorUid, guestName } = await req.json();
    if (!ownerUid || !visitorUid) {
      return NextResponse.json({ error: "ownerUid and visitorUid required" }, { status: 400 });
    }

    const callRef = db.collection("directCalls").doc();
    await callRef.set({
      callId: callRef.id,
      ownerUid,
      visitorUid,
      guestName: guestName || null,
      status: "ringing",
      roomUrl: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
      endedAt: null,
    });

    return NextResponse.json({ callId: callRef.id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initiate call" }, { status: 500 });
  }
}

// PUT /api/direct-call — accept or decline
export async function PUT(req: NextRequest) {
  try {
    const { callId, action } = await req.json();
    if (!callId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: "callId and action (accept/decline) required" }, { status: 400 });
    }

    const callRef = db.collection("directCalls").doc(callId);
    const callSnap = await callRef.get();
    if (!callSnap.exists) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const callData = callSnap.data()!;

    if (action === 'decline') {
      await callRef.update({
        status: 'declined',
        endedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Accept — create Daily.co room
    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `bae-direct-${Date.now()}-${callData.ownerUid.slice(0, 6)}`,
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
      await callRef.update({ status: 'missed', endedAt: new Date().toISOString() });
      return NextResponse.json({ error: "Room creation failed" }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Update call record with room URL
    await callRef.update({
      status: 'accepted',
      roomUrl: roomData.url,
      answeredAt: now,
    });

    // Update both users so they can join
    const batch = db.batch();
    batch.set(db.collection("users").doc(callData.ownerUid), {
      status: "matched",
      currentRoomUrl: roomData.url,
      partnerId: callData.visitorUid,
      matchedAt: now,
    }, { merge: true });
    batch.set(db.collection("users").doc(callData.visitorUid), {
      status: "matched",
      currentRoomUrl: roomData.url,
      partnerId: callData.ownerUid,
      matchedAt: now,
    }, { merge: true });
    await batch.commit();

    return NextResponse.json({
      success: true,
      roomUrl: roomData.url,
      partnerId: callData.visitorUid,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to handle call" }, { status: 500 });
  }
}
