import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// POST /api/ping — send a ping to an offline user
export async function POST(req: NextRequest) {
  try {
    const { ownerUid, visitorUid, visitorName, visitorInterests } = await req.json();
    if (!ownerUid || !visitorUid) {
      return NextResponse.json({ error: "ownerUid and visitorUid required" }, { status: 400 });
    }

    const pingRef = db.collection("pings").doc();
    await pingRef.set({
      pingId: pingRef.id,
      ownerUid,
      visitorUid,
      visitorName: visitorName || 'Someone',
      visitorInterests: visitorInterests || [],
      status: "unread",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, pingId: pingRef.id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send ping" }, { status: 500 });
  }
}

// GET /api/ping?ownerUid=xxx — fetch unread pings
export async function GET(req: NextRequest) {
  const ownerUid = req.nextUrl.searchParams.get("ownerUid");
  if (!ownerUid) {
    return NextResponse.json({ error: "ownerUid required" }, { status: 400 });
  }

  try {
    const pingsSnap = await db.collection("pings")
      .where("ownerUid", "==", ownerUid)
      .where("status", "==", "unread")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const pings = pingsSnap.docs.map(doc => doc.data());
    return NextResponse.json({ pings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch pings" }, { status: 500 });
  }
}
