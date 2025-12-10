import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET - Check which lists contain a specific problem
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!problemId) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });
    }

    // Get all lists that contain this problem for this user
    const { data: lists, error } = await supabase
      .from('user_list_problems')
      .select('id, list_id')
      .eq('user_id', user.id)
      .eq('problem_id', parseInt(problemId));

    if (error) {
      console.error('Error checking problem lists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lists: lists || [] });
  } catch (error) {
    console.error('Error in check problems API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}