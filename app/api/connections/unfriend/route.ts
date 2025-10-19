import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/connections/unfriend
 * Remove a connection (unfriend)
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Prevent self-unfriend
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Cannot unfriend yourself' }, { status: 400 });
    }

    // Find the connection (bidirectional check)
    const { data: connection, error: findError } = await supabase
      .from('connections')
      .select('id, status')
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${user_id}),and(from_user_id.eq.${user_id},to_user_id.eq.${user.id})`
      )
      .eq('status', 'accepted')
      .single();

    if (findError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('connections')
      .delete()
      .eq('id', connection.id);

    if (deleteError) {
      console.error('Error removing connection:', deleteError);
      return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Connection removed successfully',
    });
  } catch (error) {
    console.error('Error in unfriend API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

