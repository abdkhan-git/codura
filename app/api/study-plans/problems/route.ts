import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET - Get problems in a specific list
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }

    // Get problems in the list with problem details
    const { data: listProblems, error } = await supabase
      .from('user_list_problems')
      .select(`
        id,
        notes,
        order_index,
        added_at,
        problem_id,
        problems (
          id,
          leetcode_id,
          title,
          title_slug,
          difficulty,
          acceptance_rate,
          topic_tags
        )
      `)
      .eq('list_id', listId)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching list problems:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ problems: listProblems || [] });
  } catch (error) {
    console.error('Error in list problems GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a problem to a list
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listId, problemId, notes } = body;

    if (!listId || !problemId) {
      return NextResponse.json(
        { error: 'List ID and Problem ID are required' },
        { status: 400 }
      );
    }

    // Get the current max order_index for this list
    const { data: maxOrder } = await supabase
      .from('user_list_problems')
      .select('order_index')
      .eq('list_id', listId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.order_index || 0) + 1;

    // Add problem to list
    const { data: listProblem, error } = await supabase
      .from('user_list_problems')
      .insert({
        list_id: listId,
        problem_id: problemId,
        user_id: user.id,
        notes: notes || null,
        order_index: nextOrder
      })
      .select(`
        id,
        notes,
        order_index,
        added_at,
        problem_id,
        problems (
          id,
          leetcode_id,
          title,
          title_slug,
          difficulty,
          acceptance_rate,
          topic_tags
        )
      `)
      .single();

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Problem already exists in this list' },
          { status: 400 }
        );
      }
      console.error('Error adding problem to list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listProblem }, { status: 201 });
  } catch (error) {
    console.error('Error in list problems POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a problem from a list
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
      return NextResponse.json({ error: 'List problem ID is required' }, { status: 400 });
    }

    // Delete the problem from list
    const { error } = await supabase
      .from('user_list_problems')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing problem from list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in list problems DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}