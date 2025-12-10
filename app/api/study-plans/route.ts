import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch user's problem lists (OPTIMIZED - No N+1 queries!)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the optimized RPC function that gets counts in a single query!
    // This eliminates N+1 query problem (was making 2 queries per list)
    const { data: userLists, error: listsError } = await supabase
      .rpc('get_user_study_plans_with_counts', { p_user_id: user.id });

    if (listsError) {
      console.error('Error fetching user problem lists:', listsError);
      return NextResponse.json({ error: listsError.message }, { status: 500 });
    }

    // Also get official problem lists for reference
    const { data: officialLists, error: officialError } = await supabase
      .from('problem_lists')
      .select('id, name, description, color, total_problems, is_official')
      .eq('is_official', true)
      .order('created_at', { ascending: true });

    if (officialError) {
      console.error('Error fetching official lists:', officialError);
    }

    return NextResponse.json({
      userLists: userLists || [],
      officialLists: officialLists || []
    });
  } catch (error) {
    console.error('Error in study plans GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new problem list
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, is_public } = body;

    if (!name) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    // Create the list
    const { data: list, error } = await supabase
      .from('user_problem_lists')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        color: color || 'from-brand to-orange-300',
        is_default: false,
        is_public: is_public || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating problem list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error('Error in study plans POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a problem list
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, color, is_public } = body;

    if (!id) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (is_public !== undefined) updates.is_public = is_public;

    // Update the list
    const { data: list, error } = await supabase
      .from('user_problem_lists')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating problem list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error in study plans PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a problem list
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }

    // Check if it's the default list
    const { data: list } = await supabase
      .from('user_problem_lists')
      .select('is_default')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (list?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default Saved Problems list' },
        { status: 400 }
      );
    }

    // Delete the list (cascade will delete associated problems)
    const { error } = await supabase
      .from('user_problem_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting problem list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in study plans DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}