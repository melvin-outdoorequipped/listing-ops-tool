// app/api/push/notify/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { subscriptions } from '../subscribe';

// Configure web-push
const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@outdoorequipped.com',
    publicKey,
    privateKey
  );
} else {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, body: message, url, taskId } = body;

    if (subscriptions.length === 0) {
      console.log('📭 No push subscriptions to notify');
      return NextResponse.json({ success: true, sent: 0 });
    }

    const payload = JSON.stringify({
      title: title || '📋 New Task Added!',
      body: message || 'New tasks have been added to your dashboard!',
      url: url || '/',
      taskId: taskId || '',
      tag: `task-${Date.now()}`,
    });

    const notificationPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          payload
        );
        return { success: true };
      } catch (error: any) {
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          const index = subscriptions.findIndex(
            (s) => s.endpoint === subscription.endpoint
          );
          if (index !== -1) {
            subscriptions.splice(index, 1);
            console.log('🗑️ Removed invalid subscription');
          }
        }
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    console.log(`📨 Sent ${sent} notifications`);

    return NextResponse.json({
      success: true,
      sent,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}