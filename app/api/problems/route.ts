import { createClient } from '@/utils/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean).map(Number);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('problems')
      .select('*', { count: 'exact' });

    // Filter by specific IDs (for challenge problems)
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
      // When filtering by IDs, return all matching (no pagination)
      const { data: problems, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        problems: problems || [],
        total: problems?.length || 0,
      });
    }

    // Filter by difficulty
    if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      query = query.eq('difficulty', difficulty);
    }

    // Filter by search term (title)
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Filter by tags (using JSONB contains)
    if (tags && tags.length > 0) {
      // Check if ANY of the tags match using PostgREST syntax
      const tagFilters = tags.map(tag => `topic_tags.cs.[{"slug":"${tag}"}]`).join(',');
      query = query.or(tagFilters);
    }

    // Filter out premium problems by default (optional)
    const showPremium = searchParams.get('premium') === 'true';
    if (!showPremium) {
      query = query.eq('is_premium', false);
    }

    // Pagination
    query = query
      .order('leetcode_id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: problems, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      problems: problems || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
