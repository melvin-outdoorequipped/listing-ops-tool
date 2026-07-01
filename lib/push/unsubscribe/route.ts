// app/api/push/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { subscriptions } from '../subscribe/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    // Remove subscription
    const index = subscriptions.findIndex((s) => s.endpoint === endpoint);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      console.log(`✅ Push subscription removed`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}