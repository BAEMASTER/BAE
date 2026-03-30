import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { validateUsername } from "@/lib/reservedUsernames";

// GET /api/username?username=xyz — check availability
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim();
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error }, { status: 200 });
  }

  const doc = await db.collection("usernames").doc(username).get();
  return NextResponse.json({ available: !doc.exists }, { status: 200 });
}

// POST /api/username — claim a username
export async function POST(req: NextRequest) {
  try {
    const { uid, username } = await req.json();
    if (!uid || !username) {
      return NextResponse.json({ error: "uid and username required" }, { status: 400 });
    }

    const lower = username.toLowerCase().trim();
    const validation = validateUsername(lower);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get user's current username (if any) to clean up
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const oldUsername = userSnap.exists ? userSnap.data()?.username : null;

    // If they already have this username, no-op
    if (oldUsername === lower) {
      return NextResponse.json({ success: true, username: lower }, { status: 200 });
    }

    // Transaction: claim new username atomically
    await db.runTransaction(async (transaction) => {
      const usernameRef = db.collection("usernames").doc(lower);
      const usernameSnap = await transaction.get(usernameRef);

      if (usernameSnap.exists) {
        throw new Error("Username is already taken");
      }

      // Claim the new username
      transaction.set(usernameRef, {
        uid,
        createdAt: new Date().toISOString(),
      });

      // Update user doc
      transaction.update(userRef, {
        username: lower,
        updatedAt: new Date().toISOString(),
      });

      // Release old username if they had one
      if (oldUsername) {
        transaction.delete(db.collection("usernames").doc(oldUsername));
      }
    });

    return NextResponse.json({ success: true, username: lower }, { status: 200 });
  } catch (error: any) {
    const status = error.message === "Username is already taken" ? 409 : 500;
    return NextResponse.json({ error: error.message || "Failed to claim username" }, { status });
  }
}
