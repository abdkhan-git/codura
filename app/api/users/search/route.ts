import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { UserSearchResult } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search
 * Search for users with filters
 *
 * Query Parameters:
 * - q: Search query (searches username, full_name, university, job_title, company)
 * - university: Filter by university
 * - graduation_year: Filter by graduation year
 * - company: Filter by company/job title
 * - min_solved: Minimum problems solved
 * - max_solved: Maximum problems solved
 * - min_rating: Minimum contest rating
 * - max_rating: Maximum contest rating
 * - sort: Sort by (relevance, activity, connections, rating_high, rating_low, problems_high, problems_low)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 25, max: 50)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || null;
    const university = searchParams.get('university') || null;
    const graduationYear = searchParams.get('graduation_year') || null;
    const company = searchParams.get('company') || null;
    const minSolved = searchParams.get('min_solved') ? parseInt(searchParams.get('min_solved')!) : null;
    const maxSolved = searchParams.get('max_solved') ? parseInt(searchParams.get('max_solved')!) : null;
    const minRating = searchParams.get('min_rating') ? parseInt(searchParams.get('min_rating')!) : null;
    const maxRating = searchParams.get('max_rating') ? parseInt(searchParams.get('max_rating')!) : null;
    const sortBy = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50); // Cap at 50

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Call the search_users database function
    // This will work with both the current and enhanced versions
    const { data: users, error: searchError } = await supabase.rpc('search_users', {
      p_current_user_id: user.id,
      p_search_query: searchQuery,
      p_university: university,
      p_graduation_year: graduationYear,
      p_company: company,
      p_min_solved: minSolved,
      p_max_solved: maxSolved,
      p_min_rating: minRating,
      p_max_rating: maxRating,
      p_sort_by: sortBy,
      p_limit: limit,
      p_offset: offset,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    // Get total count for pagination using the count function
    const { data: totalCount, error: countError } = await supabase.rpc('count_users', {
      p_current_user_id: user.id,
      p_search_query: searchQuery,
      p_university: university,
      p_graduation_year: graduationYear,
      p_company: company,
      p_min_solved: minSolved,
      p_max_solved: maxSolved,
      p_min_rating: minRating,
      p_max_rating: maxRating,
    });

    if (countError) {
      console.error('Count error:', countError);
    }

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      users: users as UserSearchResult[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
