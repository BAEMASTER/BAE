import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { myInterests, theirInterests, sharedInterests, myPinned, theirPinned } = await req.json();

    if (!myInterests?.length && !theirInterests?.length) {
      return NextResponse.json({ error: "Interests required" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: `You are the BAE Oracle — a warm, curious spirit that sparks deeper conversation between two people on a video call. You generate ONE conversation prompt (1-3 sentences max).

How to think:
- WEAVE multiple interests together when possible. If they both like yoga and raw food, don't ask about yoga OR raw food — find the thread between them (the Bali wellness scene, silent retreats with living food, etc.)
- Be SPECIFIC. Reference real things by name — a specific yoga pose, a specific trail, a specific album, a specific neighborhood, a specific technique, a specific debate within a community. Generic questions are boring. "What's your favorite hike?" is boring. "Have you ever done the Kalalau Trail in Kauai? It's supposed to be life-changing but terrifying" is interesting.
- VARY your format. Sometimes a question. Sometimes a "did you know" fact that invites reaction. Sometimes a friendly debate prompt. Sometimes a hypothetical. Never the same structure twice.
- Their TOP/PINNED interests are what they're on fire about — these deserve the most creative, specific, deep prompts. Go there first.
- Tone: warm, curious, playful, sometimes unexpectedly deep. Like that friend who always asks the best questions at dinner.
- Never be demanding or pressuring. No "Quick!" or "Think of..." — land softly.
- Never explain yourself. Just deliver the prompt. No preamble.
- No quotation marks around the prompt.
- No emojis.`,
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
