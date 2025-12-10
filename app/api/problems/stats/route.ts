import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get total count
    const { count: totalCount } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });

    // Get count by difficulty
    const { count: easyCount } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'Easy');

    const { count: mediumCount } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'Medium');

    const { count: hardCount } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'Hard');

    // Get unique tags
    const { data: problems } = await supabase
      .from('problems')
      .select('topic_tags')
      .limit(1000);

    const tagsSet = new Set<string>();
    problems?.forEach((p: any) => {
      if (p.topic_tags && Array.isArray(p.topic_tags)) {
        p.topic_tags.forEach((tag: any) => {
          if (tag.name) tagsSet.add(tag.name);
        });
      }
    });

    return NextResponse.json({
      total: totalCount || 0,
      byDifficulty: {
        Easy: easyCount || 0,
        Medium: mediumCount || 0,
        Hard: hardCount || 0,
      },
      totalTags: tagsSet.size,
    });
  } catch (error) {
    console.error('Error fetching problem stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
