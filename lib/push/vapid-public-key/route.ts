// app/api/push/vapid-public-key/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  
  if (!publicKey) {
    console.warn('VAPID_PUBLIC_KEY is not set in environment variables');
  }
  
  return NextResponse.json({ publicKey });
}