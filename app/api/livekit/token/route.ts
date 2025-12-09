import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const livekitUrl = process.env.LIVEKIT_WS_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return NextResponse.json(
        { error: 'LiveKit environment variables are not configured' },
        { status: 500 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('id, pod_id, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('study_pod_members')
      .select('id, role')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be an active pod member to join this session' },
        { status: 403 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Participant';

    const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      name,
      metadata: JSON.stringify({
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      }),
    });

    accessToken.addGrant({
      room: sessionId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await accessToken.toJwt();

    return NextResponse.json({
      token,
      serverUrl: livekitUrl,
      participant: { name, avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null },
    });
  } catch (error) {
    console.error('[LiveKitToken] Failed to create token', error);
    return NextResponse.json({ error: 'Failed to create LiveKit token' }, { status: 500 });
  }
}

