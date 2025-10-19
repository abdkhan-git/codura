import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { UserSearchResult } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search
 * Search for users with filters
 *
 * Query Parameters:
 * - q: Search query (searches username, full_name, university, job_title)
 * - university: Filter by university
 * - graduation_year: Filter by graduation year
 * - min_solved: Minimum problems solved
 * - max_solved: Maximum problems solved
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
    const minSolved = searchParams.get('min_solved') ? parseInt(searchParams.get('min_solved')!) : null;
    const maxSolved = searchParams.get('max_solved') ? parseInt(searchParams.get('max_solved')!) : null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50); // Cap at 50

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Call the search_users database function
    const { data: users, error: searchError } = await supabase.rpc('search_users', {
      p_current_user_id: user.id,
      p_search_query: searchQuery,
      p_university: university,
      p_graduation_year: graduationYear,
      p_min_solved: minSolved,
      p_max_solved: maxSolved,
      p_limit: limit,
      p_offset: offset,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    // Get total count for pagination (without filters for simplicity, or you can create a count function)
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .neq('user_id', user.id);

    if (countError) {
      console.error('Count error:', countError);
    }

    return NextResponse.json({
      users: users as UserSearchResult[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
