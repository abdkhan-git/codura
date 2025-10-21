import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test 1: Get user's conversations
    const { data: userConversations, error: userConversationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (userConversationsError) {
      return NextResponse.json({ 
        error: "Failed to get user conversations",
        details: userConversationsError.message 
      }, { status: 500 });
    }

    const conversationIds = userConversations?.map(uc => uc.conversation_id) || [];

    // Test 2: Get conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds);

    if (conversationsError) {
      return NextResponse.json({ 
        error: "Failed to get conversations",
        details: conversationsError.message 
      }, { status: 500 });
    }

    // Test 3: Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, role, status')
      .in('conversation_id', conversationIds)
      .eq('status', 'active');

    if (participantsError) {
      return NextResponse.json({
        error: "Failed to get participants",
        details: participantsError.message
      }, { status: 500 });
    }

    // Get user data separately
    const participantUserIds = [...new Set(participants?.map(p => p.user_id) || [])];
    const { data: participantUsers } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', participantUserIds);

    // Test 4: Get connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (connectionsError) {
      return NextResponse.json({ 
        error: "Failed to get connections",
        details: connectionsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      conversations: conversations || [],
      participants: participants || [],
      participantUsers: participantUsers || [],
      connections: connections || [],
      conversationIds: conversationIds
    });

  } catch (error) {
    console.error('Test messaging error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
