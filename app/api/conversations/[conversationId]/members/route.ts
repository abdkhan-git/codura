import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Fetch conversation members
    const { data: members, error: membersError } = await supabase
      .from('conversation_participants')
      .select(`
        id,
        role,
        joined_at,
        user:profiles!conversation_participants_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Transform the data
    const transformedMembers = members.map(member => ({
      id: member.user.id,
      name: member.user.full_name || 'Unknown',
      username: member.user.username,
      avatar: member.user.avatar_url,
      role: member.role,
      joined_at: member.joined_at
    }));

    return NextResponse.json({
      success: true,
      members: transformedMembers
    });

  } catch (error) {
    console.error('Error in fetch members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = params;
    const { user_id, role = 'member' } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/owner of the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(participant.role)) {
      return NextResponse.json({ error: 'Not authorized to add members' }, { status: 403 });
    }

    // Check if user to add exists
    const { data: userToAdd, error: userToAddError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', user_id)
      .single();

    if (userToAddError || !userToAdd) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id)
      .single();

    if (existingParticipant) {
      return NextResponse.json({ error: 'User is already a participant' }, { status: 400 });
    }

    // Add user to conversation
    const { data: newParticipant, error: addError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: user_id,
        role: role,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (addError) {
      console.error('Error adding member:', addError);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      participant: {
        ...newParticipant,
        user: userToAdd
      }
    });

  } catch (error) {
    console.error('Error in add member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/owner of the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(participant.role)) {
      return NextResponse.json({ error: 'Not authorized to remove members' }, { status: 403 });
    }

    // Prevent removing the owner
    if (user_id === user.id && participant.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 });
    }

    // Remove user from conversation
    const { error: removeError } = await supabase
      .from('conversation_participants')
      .update({ status: 'left' })
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error in remove member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}