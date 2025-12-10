import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Get users who engaged with a post (liked, reposted, or bookmarked)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // likes, reposts, or bookmarks

    if (!type || !['likes', 'reposts', 'bookmarks'].includes(type)) {
      return NextResponse.json({ error: 'Invalid engagement type' }, { status: 400 });
    }

    let users: any[] = [];

    if (type === 'likes') {
      // Get users who liked the post
      const { data: likes, error } = await supabase
        .from('post_likes')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching likes:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch user data for each like
      if (likes && likes.length > 0) {
        const userIds = likes.map(like => like.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);

        users = usersData || [];
      }
    } else if (type === 'reposts') {
      // Get users who reposted the post
      const { data: reposts, error } = await supabase
        .from('post_reposts')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reposts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch user data for each repost
      if (reposts && reposts.length > 0) {
        const userIds = reposts.map(repost => repost.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);

        users = usersData || [];
      }
    } else if (type === 'bookmarks') {
      // Get users who bookmarked the post
      const { data: bookmarks, error } = await supabase
        .from('saved_posts')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch user data for each bookmark
      if (bookmarks && bookmarks.length > 0) {
        const userIds = bookmarks.map(bookmark => bookmark.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);

        users = usersData || [];
      }
    }

    return NextResponse.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get engagement API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
