import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { UserSearchResult } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/suggestions
 * Get personalized connection suggestions for the current user
 *
 * Suggests users based on:
 * 1. Same university
 * 2. Mutual connections
 * 3. Similar problem-solving level
 * 4. Not already connected
 *
 * Query Parameters:
 * - limit: Number of suggestions (default: 10, max: 20)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    // Get current user's profile to find similar users
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('university, graduation_year')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Get current user's stats for similarity matching
    const { data: currentUserStats } = await supabase
      .from('user_stats')
      .select('total_solved, contest_rating')
      .eq('user_id', user.id)
      .single();

    // Get users already connected or with pending requests
    const { data: existingConnections } = await supabase
      .from('connections')
      .select('from_user_id, to_user_id')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    // Extract user IDs to exclude
    const excludeUserIds = new Set<string>([user.id]);
    existingConnections?.forEach((conn) => {
      excludeUserIds.add(conn.from_user_id);
      excludeUserIds.add(conn.to_user_id);
    });

    // Build suggestions query with weighted scoring
    let suggestionsQuery = supabase
      .from('users')
      .select(`
        user_id,
        username,
        full_name,
        avatar_url,
        university,
        graduation_year,
        job_title,
        bio,
        is_public,
        user_stats (
          total_solved,
          current_streak,
          contest_rating
        )
      `)
      .not('user_id', 'in', `(${Array.from(excludeUserIds).join(',')})`)
      .limit(limit * 3); // Get more than needed for filtering

    const { data: potentialSuggestions, error: suggestionsError } = await suggestionsQuery;

    if (suggestionsError) {
      console.error('Suggestions error:', suggestionsError);
      return NextResponse.json({ error: suggestionsError.message }, { status: 500 });
    }

    if (!potentialSuggestions || potentialSuggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Score each suggestion based on similarity
    const scoredSuggestions = potentialSuggestions.map((suggestion: any) => {
      let score = 0;
      const stats = suggestion.user_stats?.[0];

      // Same university: +100 points
      if (suggestion.university && suggestion.university === currentUserProfile.university) {
        score += 100;
      }

      // Same graduation year: +50 points
      if (suggestion.graduation_year && suggestion.graduation_year === currentUserProfile.graduation_year) {
        score += 50;
      }

      // Similar problem-solving level (within 50 problems): +75 points
      if (stats && currentUserStats) {
        const solvedDiff = Math.abs(stats.total_solved - currentUserStats.total_solved);
        if (solvedDiff <= 50) {
          score += 75;
        } else if (solvedDiff <= 100) {
          score += 30;
        }

        // Similar contest rating (within 200 points): +50 points
        const ratingDiff = Math.abs(stats.contest_rating - currentUserStats.contest_rating);
        if (ratingDiff <= 200) {
          score += 50;
        } else if (ratingDiff <= 400) {
          score += 25;
        }
      }

      // Active users (has submissions): +25 points
      if (stats && stats.total_solved > 0) {
        score += 25;
      }

      // Users with profile info: +10 points
      if (suggestion.bio) {
        score += 10;
      }

      return {
        ...suggestion,
        score,
      };
    });

    // Sort by score (highest first) and take top suggestions
    const topSuggestions = scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Get connection status and mutual connections for each suggestion
    const suggestionsWithDetails = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const { data: connectionStatus } = await supabase.rpc('get_connection_status', {
          user1_id: user.id,
          user2_id: suggestion.user_id,
        });

        const { data: mutualCount } = await supabase.rpc('get_mutual_connections_count', {
          user1_id: user.id,
          user2_id: suggestion.user_id,
        });

        const stats = suggestion.user_stats?.[0] || {
          total_solved: 0,
          current_streak: 0,
          contest_rating: 0,
        };

        return {
          user_id: suggestion.user_id,
          username: suggestion.username,
          full_name: suggestion.full_name,
          avatar_url: suggestion.avatar_url,
          university: suggestion.university,
          graduation_year: suggestion.graduation_year,
          job_title: suggestion.job_title,
          bio: suggestion.bio,
          total_solved: stats.total_solved,
          current_streak: stats.current_streak,
          contest_rating: stats.contest_rating,
          connection_status: connectionStatus || 'none',
          mutual_connections_count: mutualCount || 0,
          is_public: suggestion.is_public,
        } as UserSearchResult;
      })
    );

    return NextResponse.json({
      suggestions: suggestionsWithDetails,
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
