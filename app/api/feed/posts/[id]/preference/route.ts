import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PreferenceType = 'not_interested' | 'hide_post' | 'hide_author' | 'report';

// Set post preference (not interested, hide, report)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
    const body = await request.json();
    const { preference_type, reason = null, metadata = {} } = body as {
      preference_type: PreferenceType;
      reason?: string | null;
      metadata?: Record<string, any>;
    };

    // Validate preference type
    const validTypes: PreferenceType[] = ['not_interested', 'hide_post', 'hide_author', 'report'];
    if (!validTypes.includes(preference_type)) {
      return NextResponse.json({ error: 'Invalid preference type' }, { status: 400 });
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('id, user_id, post_type')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Insert or update preference
    const { data: preference, error: prefError } = await supabase
      .from('post_preferences')
      .upsert({
        user_id: user.id,
        post_id: postId,
        preference_type,
        reason,
        metadata: metadata || {}
      }, {
        onConflict: 'user_id,post_id,preference_type'
      })
      .select()
      .single();

    if (prefError) {
      console.error('Error setting post preference:', prefError);
      return NextResponse.json({ error: 'Failed to set preference' }, { status: 500 });
    }

    // If hiding author, also hide all their posts
    if (preference_type === 'hide_author') {
      const { data: authorPosts } = await supabase
        .from('social_posts')
        .select('id')
        .eq('user_id', post.user_id);

      if (authorPosts && authorPosts.length > 0) {
        const hidePromises = authorPosts.map(authorPost =>
          supabase
            .from('post_preferences')
            .upsert({
              user_id: user.id,
              post_id: authorPost.id,
              preference_type: 'hide_post',
              reason: 'Author hidden'
            }, {
              onConflict: 'user_id,post_id,preference_type'
            })
        );

        await Promise.all(hidePromises);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Preference ${preference_type} set successfully`,
      preference
    });
  } catch (error) {
    console.error('Set preference API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get all preferences for a post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    const { data: preferences, error } = await supabase
      .from('post_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({
      preferences: preferences || [],
      is_hidden: preferences?.some(p => p.preference_type === 'hide_post' || p.preference_type === 'not_interested') || false,
      is_author_hidden: preferences?.some(p => p.preference_type === 'hide_author') || false
    });
  } catch (error) {
    console.error('Get preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove preference
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
    const { searchParams } = new URL(request.url);
    const preferenceType = searchParams.get('type');

    let query = supabase
      .from('post_preferences')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (preferenceType) {
      query = query.eq('preference_type', preferenceType);
    }

    const { error } = await query;

    if (error) {
      console.error('Error removing preference:', error);
      return NextResponse.json({ error: 'Failed to remove preference' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preference removed successfully'
    });
  } catch (error) {
    console.error('Remove preference API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
