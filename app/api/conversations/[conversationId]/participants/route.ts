import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/[conversationId]/participants
 * Add participants to a group conversation
 */
export async function POST(
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
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids is required and must be an array' },
        { status: 400 }
      );
    }

    // Get conversation and verify it's a group chat
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, type, created_by')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.type !== 'group') {
      return NextResponse.json(
        { error: 'Can only add participants to group conversations' },
        { status: 400 }
      );
    }

    // Verify user is owner or admin
    const { data: userParticipation } = await supabase
      .from('conversation_participants')
      .select('role, status')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userParticipation || !['owner', 'admin'].includes(userParticipation.role)) {
      return NextResponse.json(
        { error: 'Only group owners and admins can add participants' },
        { status: 403 }
      );
    }

    // Check if users are connections
    const { data: connections } = await supabase
      .from('connections')
      .select('from_user_id, to_user_id')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const validUserIds = user_ids.filter(id =>
      connections?.some(conn =>
        (conn.from_user_id === user.id && conn.to_user_id === id) ||
        (conn.to_user_id === user.id && conn.from_user_id === id)
      )
    );

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found. You can only add your connections.' },
        { status: 400 }
      );
    }

    // Check if users are already participants
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .in('user_id', validUserIds);

    const existingUserIds = existingParticipants?.map(p => p.user_id) || [];
    const newUserIds = validUserIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { error: 'All users are already participants' },
        { status: 400 }
      );
    }

    // Add new participants
    const newParticipants = newUserIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      role: 'member',
      status: 'active',
      added_by: user.id
    }));

    const { error: insertError } = await supabase
      .from('conversation_participants')
      .insert(newParticipants);

    if (insertError) {
      console.error('Error adding participants:', insertError);
      return NextResponse.json(
        { error: 'Failed to add participants' },
        { status: 500 }
      );
    }

    // Get user info for added participants
    const { data: addedUsers } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', newUserIds);

    // Create system messages for each added user
    const systemMessages = newUserIds.map(userId => {
      const addedUser = addedUsers?.find(u => u.user_id === userId);
      return {
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: 'system',
        content: `${addedUser?.full_name || addedUser?.username || 'Someone'} was added to the group`,
        metadata: {
          type: 'user_added',
          user_id: userId,
          user_name: addedUser?.full_name || addedUser?.username,
          actor_id: user.id
        }
      };
    });

    await supabase.from('messages').insert(systemMessages);

    return NextResponse.json({
      success: true,
      added_count: newUserIds.length,
      added_users: addedUsers
    });

  } catch (error) {
    console.error('Error in POST /api/conversations/[conversationId]/participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[conversationId]/participants
 * Remove a participant from a group conversation
 */
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('user_id');

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('type, created_by')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.type !== 'group') {
      return NextResponse.json(
        { error: 'Conversation not found or not a group' },
        { status: 404 }
      );
    }

    // Verify user is owner/admin or removing themselves
    const { data: userParticipation } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const canRemoveOthers = userParticipation && ['owner', 'admin'].includes(userParticipation.role);
    const removingSelf = userIdToRemove === user.id;

    if (!canRemoveOthers && !removingSelf) {
      return NextResponse.json(
        { error: 'Only group owners and admins can remove others' },
        { status: 403 }
      );
    }

    // Cannot remove the owner
    if (conversation.created_by === userIdToRemove && !removingSelf) {
      return NextResponse.json(
        { error: 'Cannot remove the group owner' },
        { status: 403 }
      );
    }

    // Update participant status
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({
        status: removingSelf ? 'left' : 'removed',
        left_at: new Date().toISOString(),
        ...((!removingSelf) && { removed_by: user.id })
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdToRemove);

    if (updateError) {
      console.error('Error removing participant:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove participant' },
        { status: 500 }
      );
    }

    // Get removed user info
    const { data: removedUser } = await supabase
      .from('users')
      .select('full_name, username')
      .eq('user_id', userIdToRemove)
      .single();

    // Create system message
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: 'system',
        content: removingSelf
          ? `${removedUser?.full_name || removedUser?.username || 'Someone'} left the group`
          : `${removedUser?.full_name || removedUser?.username || 'Someone'} was removed from the group`,
        metadata: {
          type: removingSelf ? 'user_left' : 'user_removed',
          user_id: userIdToRemove,
          user_name: removedUser?.full_name || removedUser?.username,
          actor_id: user.id
        }
      });

    return NextResponse.json({
      success: true,
      message: removingSelf ? 'You left the group' : 'Participant removed successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/conversations/[conversationId]/participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
