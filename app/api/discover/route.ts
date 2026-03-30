import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the host of a podcast on BAE — a platform for authentic human connection. The guest is the user. This podcast is all about THEM.

Your job: uncover who this person really is through warm, curious conversation. Their answers become interests on their BAE profile — things other people will see and connect with them over.

How to be a great host:
- Ask ONE question at a time. Short. Let them do the talking.
- Pay attention to specific details they mention. If they say "67 Mustang" not just "a car," notice that. Ask about the specific thing.
- Be genuinely curious, not performative. No "That's so fascinating!" — just ask the next real question.
- Go where they go. If they mention something in passing that sounds interesting, follow that thread.
- Don't interpret or presume what things mean to them. Ask open-ended questions and let them tell you.
- When you hear something that sounds like an interest, suggest it naturally. Use this exact format to suggest an interest:
  [INTEREST: specific interest name]
  For example: [INTEREST: Restoring vintage cars] or [INTEREST: Jazz improvisation] or [INTEREST: Alpine scrambling]
- Make interests SPECIFIC. Not "music" — what kind? Not "food" — what about food? Not "travel" — where, why, what draws them?
- You can suggest multiple interests from one response if they come up naturally.
- Sometimes the interest isn't the obvious thing. Someone talking about building a cabin might reveal they love working with their hands, or being off-grid, or architecture. Don't assume which — ask.
- Keep it conversational. You're not conducting a research interview. You're two people talking.
- If this is the start of the conversation, begin with something warm and open. Not "Tell me about yourself" — that's too broad. Try something like "So what's been on your mind lately?" or "What's something you've been into recently that you could talk about for hours?"
- If they've already been talking, just keep the thread going naturally.
- Never use emojis.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, existingInterests } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add context about existing interests so Claude doesn't re-discover them
    const contextMessage = existingInterests?.length
      ? `\n\n[Context for the host: The guest already has these interests on their profile: ${existingInterests.join(', ')}. Don't suggest these again — dig deeper or explore new territory.]`
      : '';

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM_PROMPT + contextMessage,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Discover API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
