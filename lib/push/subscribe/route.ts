// app/api/push/subscribe/route.ts
import { NextResponse } from 'next/server';

// In production, store this in a database
const subscriptions: any[] = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userEmail } = body;

    // Check if subscription already exists
    const existingIndex = subscriptions.findIndex(
      (s) => s.endpoint === subscription.endpoint
    );

    if (existingIndex !== -1) {
      // Update existing
      subscriptions[existingIndex] = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userEmail,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      subscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`✅ Push subscription saved for ${userEmail}`);
    console.log(`📊 Total subscriptions: ${subscriptions.length}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

export { subscriptions };