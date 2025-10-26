import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/[conversationId]/typing
 * Indicate that user is typing
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // Use regular client for auth
    const supabase = await createClient();

    // Use service role client for database queries (bypasses RLS)
    const supabaseService = createServiceClient();

    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a participant
    const { data: participation } = await supabaseService
      .from('conversation_participants')
      .select('user_id')
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

    // Upsert typing indicator (will auto-expire after 5 seconds based on client polling)
    const { error: upsertError } = await supabaseService
      .from('conversation_typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        started_typing_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id'
      });

    if (upsertError) {
      console.error('Error updating typing indicator:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update typing indicator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in POST /api/conversations/[conversationId]/typing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[conversationId]/typing
 * Stop typing indicator
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // Use regular client for auth
    const supabase = await createClient();

    // Use service role client for database queries (bypasses RLS)
    const supabaseService = createServiceClient();

    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete typing indicator
    const { error: deleteError } = await supabaseService
      .from('conversation_typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting typing indicator:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete typing indicator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/conversations/[conversationId]/typing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/[conversationId]/typing
 * Get who is currently typing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // Use regular client for auth
    const supabase = await createClient();

    // Use service role client for database queries (bypasses RLS)
    const supabaseService = createServiceClient();

    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get typing indicators (exclude current user and those older than 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

    const { data: typingIndicators } = await supabaseService
      .from('conversation_typing_indicators')
      .select('user_id, started_typing_at')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .gte('started_typing_at', fiveSecondsAgo);

    // Get user data separately
    const typingUserIds = typingIndicators?.map(t => t.user_id) || [];
    const { data: typingUsersData } = await supabaseService
      .from('users')
      .select('user_id, full_name, username')
      .in('user_id', typingUserIds);

    const typingUsers = typingIndicators?.map(indicator => {
      const userData = typingUsersData?.find(u => u.user_id === indicator.user_id);
      return {
        user_id: indicator.user_id,
        name: userData?.full_name || userData?.username || 'Someone'
      };
    }) || [];

    return NextResponse.json({
      typing_users: typingUsers,
      count: typingUsers.length
    });

  } catch (error) {
    console.error('Error in GET /api/conversations/[conversationId]/typing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
