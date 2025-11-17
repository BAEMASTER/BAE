// app/api/create-room/route.ts
import { NextResponse } from 'next/server';

let waitingRoom: string | null = null; // ✅ simple in-memory waiting room

export async function POST() {
  try {
    // If someone is waiting, connect the next user to that same room
    if (waitingRoom) {
      const roomUrl = waitingRoom;
      waitingRoom = null; // room now filled
      console.log('🫶 Matched two users in same room:', roomUrl);
      return NextResponse.json({ url: roomUrl });
    }

    // Otherwise create a new Daily room
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          start_audio_off: false,
          start_video_off: false,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create Daily room.');

    waitingRoom = data.url; // mark this room as waiting for next user
    console.log('🚀 Created new room and waiting:', waitingRoom);

    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    console.error('❌ Error creating room:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
