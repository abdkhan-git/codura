import { NextRequest, NextResponse } from 'next/server';
import { initializeSocket } from '@/utils/socket/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // This route initializes Socket.io
    // In production, Socket.io would be initialized via a custom server
    return NextResponse.json({ status: 'Socket.io initialized' });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize Socket.io' }, { status: 500 });
  }
}
