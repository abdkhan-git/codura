import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activity_id = searchParams.get('activity_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!activity_id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Get comments for the activity
    const { data: comments, error } = await supabase
      .from('activity_comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        parent_comment_id,
        user:users!activity_comments_user_id_fkey (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('activity_id', activity_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('activity_comments')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activity_id);

    if (countError) {
      console.error('Error getting comment count:', countError);
    }

    return NextResponse.json({
      comments: comments || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Get comments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { activity_id, content, parent_comment_id } = body;

    if (!activity_id || !content) {
      return NextResponse.json({ error: 'Activity ID and content are required' }, { status: 400 });
    }

    // Add comment
    const { data: comment, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id,
        user_id: user.id,
        content,
        parent_comment_id: parent_comment_id || null
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        parent_comment_id,
        user:users!activity_comments_user_id_fkey (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      comment 
    });

  } catch (error) {
    console.error('Add comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { comment_id, content } = body;

    if (!comment_id || !content) {
      return NextResponse.json({ error: 'Comment ID and content are required' }, { status: 400 });
    }

    // Update comment
    const { data: comment, error } = await supabase
      .from('activity_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .eq('user_id', user.id)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        parent_comment_id,
        user:users!activity_comments_user_id_fkey (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      comment 
    });

  } catch (error) {
    console.error('Update comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get('comment_id');

    if (!comment_id) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Delete comment
    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Delete comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
