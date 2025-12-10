import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    // Get the problem by title_slug
    const { data: problem, error } = await supabase
      .from('problems')
      .select('*')
      .eq('title_slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Problem not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get user's progress on this problem (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();

    let userProgress = null;
    if (user) {
      const { data } = await supabase
        .from('user_problem_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problem.id)
        .maybeSingle();

      userProgress = data;
    }

    return NextResponse.json({
      problem,
      userProgress,
    });
  } catch (error) {
    console.error('Error fetching problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
