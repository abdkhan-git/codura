import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/users/[userId]/connections/count - Get connection count with privacy
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Use the database function to get count with privacy
    const { data, error } = await supabase
      .rpc('get_connection_count', {
        p_user_id: targetUserId,
        p_viewer_id: currentUser.id
      });

    if (error) {
      console.error('Error getting connection count:', error);
      return NextResponse.json({ error: 'Failed to get connection count' }, { status: 500 });
    }

    const count = data as number;

    return NextResponse.json({
      count: count >= 0 ? count : null,
      is_hidden: count === -1,
      can_view_list: count >= 0
    });
  } catch (error) {
    console.error('Connection count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
