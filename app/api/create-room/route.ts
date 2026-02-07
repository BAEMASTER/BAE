// app/api/create-room/route.ts
import { NextResponse } from 'next/server';

const WAITING_ROOMS_COLLECTION = 'waitingRooms';

export async function POST() {
  try {
    // Lazy import to avoid module-level env var check during build
    const { db } = await import('@/lib/firebaseAdmin');

    // Atomically check for and claim an existing waiting room
    const matchedRoom = await db.runTransaction(async (transaction) => {
      const waitingSnapshot = await transaction.get(
        db.collection(WAITING_ROOMS_COLLECTION)
          .where('status', '==', 'waiting')
          .limit(1)
      );

      if (!waitingSnapshot.empty) {
        const roomDoc = waitingSnapshot.docs[0];
        // Claim this room so no other request can take it
        transaction.update(roomDoc.ref, { status: 'filled' });
        return roomDoc.data().url as string;
      }

      return null;
    });

    if (matchedRoom) {
      console.log('Matched two users in same room:', matchedRoom);
      return NextResponse.json({ url: matchedRoom });
    }

    // No waiting room — create a new Daily room
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
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create Daily room.');

    // Store the new room as waiting in Firestore
    await db.collection(WAITING_ROOMS_COLLECTION).add({
      url: data.url,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    });

    console.log('Created new room and waiting:', data.url);
    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    console.error('Error creating room:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
