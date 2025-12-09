import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/sessions/[sessionId]/chat
 * Get chat messages for a session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('session_chat_messages')
      .select('id, user_id, message, message_type, metadata, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get user info for all message senders
    const userIds = [...new Set(messages?.map(m => m.user_id) || [])];
    
    let userMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', userIds);

      users?.forEach(u => {
        userMap[u.user_id] = u;
      });
    }

    // Enrich messages with user data
    const enrichedMessages = messages?.map(m => ({
      ...m,
      user: userMap[m.user_id] || null,
    })) || [];

    return NextResponse.json({
      messages: enrichedMessages,
    });
  } catch (error) {
    console.error('Unexpected error fetching chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/sessions/[sessionId]/chat
 * Send a chat message
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, message_type = 'text', metadata = {} } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('id, pod_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    const { data: participant } = await supabase
      .from('session_active_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      // Check if they're at least a pod member
      const { data: member } = await supabase
        .from('study_pod_members')
        .select('id')
        .eq('pod_id', session.pod_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!member) {
        return NextResponse.json(
          { error: 'You must be a session participant to send messages' },
          { status: 403 }
        );
      }
    }

    // Create the message
    const { data: newMessage, error: insertError } = await supabase
      .from('session_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        message: message.trim(),
        message_type,
        metadata,
      })
      .select('id, user_id, message, message_type, metadata, created_at')
      .single();

    if (insertError) {
      console.error('Error creating message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('user_id, full_name, avatar_url, username')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        ...newMessage,
        user: userData || null,
      },
    });
  } catch (error) {
    console.error('Unexpected error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

