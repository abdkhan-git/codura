import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { usernames, message } = body;
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Usernames are required' }, { status: 400 });
    }
    
    const { data: member } = await supabase.from('study_pod_members').select('role').eq('pod_id', podId).eq('user_id', user.id).eq('status', 'active').single();
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Only pod owners and moderators can invite members' }, { status: 403 });
    }
    
    const { data: usersToInvite } = await supabase.from('users').select('user_id, username').in('username', usernames);
    if (!usersToInvite || usersToInvite.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 404 });
    }
    
    const userIds = usersToInvite.map(u => u.user_id);
    const { data: existingMembers } = await supabase.from('study_pod_members').select('user_id').eq('pod_id', podId).in('user_id', userIds);
    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
    const { data: existingInvites } = await supabase.from('study_pod_invitations').select('invited_user_id').eq('pod_id', podId).in('invited_user_id', userIds).in('status', ['pending']);
    const invitedUserIds = new Set(existingInvites?.map(i => i.invited_user_id) || []);
    const usersToActuallyInvite = userIds.filter(uid => !existingUserIds.has(uid) && !invitedUserIds.has(uid));
    
    if (usersToActuallyInvite.length === 0) {
      return NextResponse.json({ error: 'All users are already members or have pending invites' }, { status: 400 });
    }
    
    const invitations = usersToActuallyInvite.map(userId => ({
      pod_id: podId,
      invited_user_id: userId,
      invited_by: user.id,
      message: message || null,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    const { data: createdInvites, error: inviteError } = await supabase.from('study_pod_invitations').insert(invitations).select();
    if (inviteError) {
      return NextResponse.json({ error: 'Failed to create invitations', details: inviteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, invitations: createdInvites, message: `Sent ${createdInvites.length} invitation(s)` });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase.from('study_pod_members').select('role').eq('pod_id', podId).eq('user_id', user.id).eq('status', 'active').single();
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Only pod owners and moderators can view invitations' }, { status: 403 });
    }
    
    const { data: invitations } = await supabase.from('study_pod_invitations').select('*').eq('pod_id', podId).in('status', ['pending']).order('created_at', { ascending: false });
    return NextResponse.json({ invitations: invitations || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
