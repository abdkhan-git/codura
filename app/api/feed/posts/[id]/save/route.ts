import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Save/Unsave a post
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
    const { collection = 'general', notes = null } = body;

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existingSave) {
      // Already saved, so unsave it
      const { error: deleteError } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', existingSave.id);

      if (deleteError) {
        console.error('Error unsaving post:', deleteError);
        return NextResponse.json({ error: 'Failed to unsave post' }, { status: 500 });
      }

      return NextResponse.json({ saved: false, message: 'Post unsaved successfully' });
    } else {
      // Not saved yet, so save it
      const { data: newSave, error: saveError } = await supabase
        .from('saved_posts')
        .insert({
          user_id: user.id,
          post_id: postId,
          collection_name: collection,
          notes
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving post:', saveError);
        return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
      }

      return NextResponse.json({
        saved: true,
        message: 'Post saved successfully',
        save: newSave
      });
    }
  } catch (error) {
    console.error('Save post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get save status
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

    const { data: save } = await supabase
      .from('saved_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    return NextResponse.json({
      saved: !!save,
      save: save || null
    });
  } catch (error) {
    console.error('Get save status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
