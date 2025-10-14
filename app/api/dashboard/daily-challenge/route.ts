import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get a random medium problem that the user hasn't solved yet
    // This simulates a "daily challenge"
    const { data: solvedProblems } = await supabase
      .from('submissions')
      .select('problem_id')
      .eq('user_id', user.id)
      .eq('status', 'Accepted');

    const solvedIds = solvedProblems?.map(p => p.problem_id) || [];

    // Get a random medium problem
    let query = supabase
      .from('problems')
      .select('id, leetcode_id, title, title_slug, difficulty, topic_tags')
      .eq('difficulty', 'Medium')
      .limit(50); // Get 50 to choose from

    // If we have solved problems, exclude them
    if (solvedIds.length > 0) {
      query = query.not('id', 'in', `(${solvedIds.join(',')})`);
    }

    const { data: problems, error } = await query;

    if (error) {
      console.error('Error fetching daily challenge:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!problems || problems.length === 0) {
      // Fallback: return any medium problem
      const { data: fallbackProblem } = await supabase
        .from('problems')
        .select('id, leetcode_id, title, title_slug, difficulty, topic_tags')
        .eq('difficulty', 'Medium')
        .limit(1)
        .single();

      if (fallbackProblem) {
        return NextResponse.json({
          challenge: {
            id: fallbackProblem.id,
            title: fallbackProblem.title,
            difficulty: fallbackProblem.difficulty,
            topics: fallbackProblem.topic_tags?.slice(0, 3).map((t: any) => t.name) || [],
            slug: fallbackProblem.title_slug,
          }
        });
      }

      // Ultimate fallback - get Two Sum problem ID
      const { data: twoSumProblem } = await supabase
        .from('problems')
        .select('id, title, title_slug, difficulty, topic_tags')
        .eq('title_slug', 'two-sum')
        .single();

      if (twoSumProblem) {
        return NextResponse.json({
          challenge: {
            id: twoSumProblem.id,
            title: twoSumProblem.title,
            difficulty: twoSumProblem.difficulty,
            topics: twoSumProblem.topic_tags?.slice(0, 3).map((t: any) => t.name) || ['Array', 'Hash Table'],
            slug: twoSumProblem.title_slug,
          }
        });
      }

      // Final fallback with hardcoded values
      return NextResponse.json({
        challenge: {
          id: 1, // Assuming Two Sum has ID 1
          title: 'Two Sum',
          difficulty: 'Easy',
          topics: ['Array', 'Hash Table'],
          slug: 'two-sum',
        }
      });
    }

    // Pick a random problem from the list (deterministic based on day)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const randomIndex = dayOfYear % problems.length;
    const challenge = problems[randomIndex];

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        topics: challenge.topic_tags?.slice(0, 3).map((t: any) => t.name) || [],
        slug: challenge.title_slug,
      }
    });
  } catch (error) {
    console.error('Error in daily challenge API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}