import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/[conversationId]/pin
 * Pin a conversation for the current user
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

    // Update conversation participant to set is_pinned = true
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error pinning conversation:', updateError);
      return NextResponse.json(
        { error: 'Failed to pin conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation pinned successfully',
    });
  } catch (error) {
    console.error('Unexpected error pinning conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[conversationId]/pin
 * Unpin a conversation for the current user
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

    // Update conversation participant to set is_pinned = false
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: false })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error unpinning conversation:', updateError);
      return NextResponse.json(
        { error: 'Failed to unpin conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation unpinned successfully',
    });
  } catch (error) {
    console.error('Unexpected error unpinning conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
