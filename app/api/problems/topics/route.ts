import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all problems with their topic tags
    const { data: problems, error } = await supabase
      .from('problems')
      .select('topic_tags')
      .not('topic_tags', 'is', null);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Extract and count all unique topics
    const topicCounts = new Map<string, { name: string; slug: string; count: number }>();

    problems?.forEach((problem) => {
      const tags = problem.topic_tags as Array<{ name: string; slug: string }>;
      if (Array.isArray(tags)) {
        tags.forEach((tag) => {
          if (tag.slug) {
            const existing = topicCounts.get(tag.slug);
            if (existing) {
              existing.count++;
            } else {
              topicCounts.set(tag.slug, {
                name: tag.name,
                slug: tag.slug,
                count: 1,
              });
            }
          }
        });
      }
    });

    // Convert to array, sort by count descending, and limit to top 30
    const topics = Array.from(topicCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return NextResponse.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
