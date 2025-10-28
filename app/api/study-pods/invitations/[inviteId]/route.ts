import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  try {
    const supabase = await createClient();
    const { inviteId } = await params;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action } = body;
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabase
      .from('study_pod_invitations')
      .select('*, pod:study_pods!inner(*)')
      .eq('id', inviteId)
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')
      .single();
    
    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invitation not found or already responded' }, { status: 404 });
    }
    
    if (new Date(invite.expires_at) < new Date()) {
      await supabase.from('study_pod_invitations').update({ status: 'expired' }).eq('id', inviteId);
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }
    
    if (action === 'accept') {
      const { data: members } = await supabase.from('study_pod_members').select('id').eq('pod_id', invite.pod_id).eq('status', 'active');
      if ((members?.length || 0) >= invite.pod.max_members) {
        return NextResponse.json({ error: 'Pod is full' }, { status: 400 });
      }
      
      await supabase.from('study_pod_members').insert({
        pod_id: invite.pod_id,
        user_id: user.id,
        role: 'member',
        status: 'active'
      });
      
      await supabase.from('study_pods').update({
        current_member_count: (members?.length || 0) + 1
      }).eq('id', invite.pod_id);
      
      await supabase.from('study_pod_activities').insert({
        pod_id: invite.pod_id,
        user_id: user.id,
        activity_type: 'member_joined',
        title: 'New member joined',
        description: 'Accepted invitation and joined the pod'
      });
    }
    
    await supabase.from('study_pod_invitations').update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString()
    }).eq('id', inviteId);
    
    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Joined pod successfully' : 'Invitation declined'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
