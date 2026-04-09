import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// GET /api/user-lookup?username=xyz — fetch public profile by username
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim();
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  try {
    // Look up username → uid
    const usernameDoc = await db.collection("usernames").doc(username).get();
    if (!usernameDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const uid = usernameDoc.data()!.uid;

    // Fetch user profile
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = userDoc.data()!;
    const staleCutoff = Date.now() - 90_000; // 90 seconds
    const lastPresence = data.lastPresenceUpdate ? new Date(data.lastPresenceUpdate).getTime() : 0;
    const isOnline = data.presence === 'online' && lastPresence > staleCutoff;

    return NextResponse.json({
      uid,
      displayName: data.displayName || 'BAE User',
      city: data.city || '',
      country: data.country || '',
      interests: data.interests || [],
      spotifySong: data.spotifySong || null,
      isOnline,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lookup failed" }, { status: 500 });
  }
}
