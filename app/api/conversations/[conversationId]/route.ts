import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/[conversationId]
 * Get conversation details with participants
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a participant
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('role, status')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        id,
        user_id,
        role,
        status,
        joined_at,
        users!inner (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('status', 'active');

    return NextResponse.json({
      conversation: {
        ...conversation,
        participants: participants?.map(p => ({
          id: p.id,
          user_id: p.user_id,
          role: p.role,
          status: p.status,
          joined_at: p.joined_at,
          user: p.users
        }))
      }
    });

  } catch (error) {
    console.error('Error in GET /api/conversations/[conversationId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversations/[conversationId]
 * Update conversation settings (name, avatar, description)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, avatar_url } = body;

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('type, created_by')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.type !== 'group') {
      return NextResponse.json(
        { error: 'Can only update group conversation settings' },
        { status: 400 }
      );
    }

    // Verify user is owner or admin
    const { data: userParticipation } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userParticipation || !['owner', 'admin'].includes(userParticipation.role)) {
      return NextResponse.json(
        { error: 'Only group owners and admins can update settings' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Update conversation
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }

    // Create system message for name change
    if (name !== undefined) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_type: 'system',
          content: `Group name changed to "${name}"`,
          metadata: {
            type: 'group_renamed',
            new_value: name,
            actor_id: user.id
          }
        });
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('Error in PATCH /api/conversations/[conversationId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
