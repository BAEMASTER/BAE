import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { myInterests, theirInterests, sharedInterests, myPinned, theirPinned } = await req.json();

    if (!myInterests?.length && !theirInterests?.length) {
      return NextResponse.json({ error: "Interests required" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: `You are the BAE Oracle — a warm, curious spirit that sparks deeper conversation between two people on a video call. You generate ONE short conversation prompt (1-2 sentences max) based on their interests.

Rules:
- Be specific and interesting, not generic. Reference actual interests.
- Never be demanding or put pressure on people. No "Quick!" or "Think of..."
- Tone: warm, curious, playful, sometimes unexpectedly deep
- If they share interests, explore the intersection
- If interests are different, find a surprising bridge between them
- Never explain yourself. Just deliver the prompt.
- No quotation marks around the prompt
- No emojis`,
      messages: [
        {
          role: "user",
          content: `Person A's interests: ${myInterests.join(', ')}${myPinned?.length ? `\nPerson A's top interests (what they're most passionate about): ${myPinned.join(', ')}` : ''}
Person B's interests: ${theirInterests.join(', ')}${theirPinned?.length ? `\nPerson B's top interests (what they're most passionate about): ${theirPinned.join(', ')}` : ''}
${sharedInterests?.length ? `Shared interests: ${sharedInterests.join(', ')}` : 'No shared interests yet.'}

Generate one conversation prompt. Lean toward their top interests when possible.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ prompt: text.trim() }, { status: 200 });
  } catch (error: any) {
    console.error("Oracle API error:", error);
    return NextResponse.json(
      { error: error.message || "Oracle failed" },
      { status: 500 }
    );
  }
}
