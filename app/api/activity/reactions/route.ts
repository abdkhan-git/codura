import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { activity_id, reaction_type } = body;

    if (!activity_id || !reaction_type) {
      return NextResponse.json({ error: 'Activity ID and reaction type are required' }, { status: 400 });
    }

    // Check if user already reacted with this type
    const { data: existingReaction, error: checkError } = await supabase
      .from('activity_reactions')
      .select('id')
      .eq('activity_id', activity_id)
      .eq('user_id', user.id)
      .eq('reaction_type', reaction_type)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing reaction:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingReaction) {
      return NextResponse.json({ error: 'Already reacted with this type' }, { status: 400 });
    }

    // Add reaction
    const { data: reaction, error: insertError } = await supabase
      .from('activity_reactions')
      .insert({
        activity_id,
        user_id: user.id,
        reaction_type
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding reaction:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      reaction 
    });

  } catch (error) {
    console.error('Add reaction API error:', error);
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
    const activity_id = searchParams.get('activity_id');
    const reaction_type = searchParams.get('reaction_type');

    if (!activity_id || !reaction_type) {
      return NextResponse.json({ error: 'Activity ID and reaction type are required' }, { status: 400 });
    }

    // Remove reaction
    const { error } = await supabase
      .from('activity_reactions')
      .delete()
      .eq('activity_id', activity_id)
      .eq('user_id', user.id)
      .eq('reaction_type', reaction_type);

    if (error) {
      console.error('Error removing reaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Remove reaction API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
