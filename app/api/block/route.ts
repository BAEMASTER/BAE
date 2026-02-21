import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { userId, blockedUserId } = await req.json();

    if (!userId || !blockedUserId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.collection("users").doc(userId).update({
      blockedUsers: FieldValue.arrayUnion(blockedUserId),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Block API error:", error);
    return NextResponse.json({ error: error.message || "Block failed" }, { status: 500 });
  }
}
