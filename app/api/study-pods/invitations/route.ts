import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: invitations } = await supabase
      .from('study_pod_invitations')
      .select(`
        *,
        pod:study_pods!inner(id, name, description, subject, skill_level, color_scheme),
        inviter:users!study_pod_invitations_invited_by_fkey(user_id, username, full_name, avatar_url)
      `)
      .eq('invited_user_id', user.id)
      .in('status', ['pending'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    return NextResponse.json({ invitations: invitations || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
