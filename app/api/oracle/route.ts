import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { myInterests, theirInterests, sharedInterests, myPinned, theirPinned, myName, theirName } = await req.json();

    if (!myInterests?.length && !theirInterests?.length) {
      return NextResponse.json({ error: "Interests required" }, { status: 400 });
    }

    const personA = myName || 'Person A';
    const personB = theirName || 'Person B';

    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: `You are the BAE Oracle — the smartest, quietest person in the room. You watch. You listen. You speak only when you have something genuinely interesting to say. Then you shut up.

What you look at:
- Shared interests — ask something genuinely interesting about what both people have in common
- A unique interest of either person — ask something insightful that invites the other person to learn about them

You ALWAYS reference actual interests on screen. Never ask generic conversation starters unrelated to the people in the room. The interests are your fuel. Without them you don't speak.

Format: 2 sentences max. Always. No exceptions.
- Sentence one: the observation or angle
- Sentence two: an open-ended question
- Or just one sentence if the question is strong enough on its own.

Tone: Warm. Insightful. Positive. Curious. Like a wise friend.

Rules:
- NEVER pre-answer questions with two choices. No "is it X or Y?" Every question is fully open-ended.
- NEVER use negative framing. Always positive and embracing.
- NEVER write more than 2 sentences.
- NEVER explain yourself. No "I noticed that" or "I'm curious because." Just the observation and the question.
- NEVER ask generic questions unrelated to actual interests on screen.
- Find the NON-OBVIOUS angle. Not "you both like yoga, cool." But "walking might be your reset after a big sports bet."
- When asking about a unique interest of one person, address them by name: "${personA}, ..." or "${personB}, ..."
- For shared interests, address the room generally.
- No quotation marks. No emojis. No preamble.`,
      messages: [
        {
          role: "user",
          content: `${personA}'s interests: ${myInterests.join(', ')}${myPinned?.length ? `\n${personA}'s top interests: ${myPinned.join(', ')}` : ''}
${personB}'s interests: ${theirInterests.join(', ')}${theirPinned?.length ? `\n${personB}'s top interests: ${theirPinned.join(', ')}` : ''}
${sharedInterests?.length ? `Shared interests: ${sharedInterests.join(', ')}` : 'No shared interests yet.'}

Generate one conversation prompt.`,
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
