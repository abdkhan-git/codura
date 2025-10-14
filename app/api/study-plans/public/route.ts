import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch public problem lists
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Get current user (optional - for checking if they own any lists)
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('user_problem_lists')
      .select(`
        id,
        user_id,
        name,
        description,
        color,
        is_public,
        created_at,
        updated_at,
        users!user_problem_lists_user_id_fkey (
          user_id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: lists, error } = await query;

    if (error) {
      console.error('Error fetching public lists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get problem counts for each list
    const listsWithCounts = await Promise.all(
      (lists || []).map(async (list) => {
        const { count } = await supabase
          .from('user_list_problems')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);

        return {
          ...list,
          problem_count: count || 0,
          is_owner: user ? list.user_id === user.id : false
        };
      })
    );

    return NextResponse.json({ lists: listsWithCounts });
  } catch (error) {
    console.error('Error in public lists GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
