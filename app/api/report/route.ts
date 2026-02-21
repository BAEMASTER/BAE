import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { reporterId, reportedId, reason, details } = await req.json();

    if (!reporterId || !reportedId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.collection("reports").add({
      reporterId,
      reportedId,
      reason,
      details: details || "",
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Report API error:", error);
    return NextResponse.json({ error: error.message || "Report failed" }, { status: 500 });
  }
}
