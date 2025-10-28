import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('user_id');

    if (!otherUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Test the connection status function
    const { data: connectionStatus, error: statusError } = await supabase.rpc('get_connection_status', {
      user1_id: user.id,
      user2_id: otherUserId,
    });

    if (statusError) {
      console.error('Error getting connection status:', statusError);
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    return NextResponse.json({
      connection_status: connectionStatus,
      current_user_id: user.id,
      other_user_id: otherUserId,
    });
  } catch (error) {
    console.error('Error in connection status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
