import { NextRequest, NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { uid, firstName, lastName, username, city, state, country, birthDate } = await req.json();

    if (!uid || !firstName || !lastName || !username || !city || !country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const usernameVal = username.toLowerCase().trim();

    // Validate username format
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(usernameVal)) {
      return NextResponse.json({ error: "No spaces or periods — just letters, numbers, or hyphens" }, { status: 400 });
    }

    // Check if username is taken
    const usernameDoc = await adminDb.collection('usernames').doc(usernameVal).get();
    if (usernameDoc.exists && usernameDoc.data()?.uid !== uid) {
      return NextResponse.json({ error: "That room name is taken — try another" }, { status: 409 });
    }

    const displayName = `${firstName.trim()} ${lastName.trim().charAt(0)}.`;

    // Save user profile
    await adminDb.collection('users').doc(uid).set({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      username: usernameVal,
      city, state, country, birthDate,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Reserve the username
    await adminDb.collection('usernames').doc(usernameVal).set({ uid });

    return NextResponse.json({ success: true, displayName, username: usernameVal }, { status: 200 });
  } catch (error: any) {
    console.error("Setup profile error:", error);
    return NextResponse.json({ error: error.message || "Setup failed" }, { status: 500 });
  }
}
