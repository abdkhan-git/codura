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
      .select('university, graduation_year, created_at')
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

    // Debug: Check total users in database
    const { data: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('user_id', { count: 'exact' });

    console.log('Suggestions Debug:', {
      currentUserId: user.id,
      currentUserProfile: currentUserProfile,
      currentUserStats: currentUserStats,
      excludeUserIds: Array.from(excludeUserIds),
      existingConnectionsCount: existingConnections?.length || 0,
      totalUsersInDatabase: totalUsers?.length || 0,
      totalUsersError: totalUsersError?.message,
      limit: limit
    });

    // Additional debug: Check if there are any users at all
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('user_id, university, graduation_year, full_name')
      .neq('user_id', user.id);
    
    console.log('All Users Debug:', {
      allUsersCount: allUsers?.length || 0,
      allUsersError: allUsersError?.message,
      sampleUsers: allUsers?.slice(0, 3).map(u => ({
        user_id: u.user_id,
        university: u.university,
        graduation_year: u.graduation_year,
        full_name: u.full_name
      }))
    });

    // Build suggestions query with weighted scoring
    // Use a simpler approach to avoid foreign key relationship issues
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
        created_at
      `)
      .not('user_id', 'in', `(${Array.from(excludeUserIds).join(',')})`)
      .limit(limit * 3); // Get more than needed for filtering

    const { data: potentialSuggestions, error: suggestionsError } = await suggestionsQuery;

    console.log('Suggestions Query Results:', {
      potentialSuggestionsCount: potentialSuggestions?.length || 0,
      suggestionsError: suggestionsError?.message,
      limit: limit
    });

    if (suggestionsError) {
      console.error('Suggestions error:', suggestionsError);
      return NextResponse.json({ error: suggestionsError.message }, { status: 500 });
    }

    if (!potentialSuggestions || potentialSuggestions.length === 0) {
      console.log('No potential suggestions found, trying fallback...');
      
      // Fallback: Get any users if no specific matches found
      const { data: fallbackSuggestions, error: fallbackError } = await supabase
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
          created_at,
          user_stats (
            total_solved,
            current_streak,
            contest_rating
          )
        `)
        .not('user_id', 'in', `(${Array.from(excludeUserIds).join(',')})`)
        .limit(limit * 2)
        .order('created_at', { ascending: false });

      console.log('Fallback Debug:', {
        fallbackSuggestionsCount: fallbackSuggestions?.length || 0,
        fallbackError: fallbackError?.message,
        excludeUserIds: Array.from(excludeUserIds)
      });

      if (fallbackError) {
        console.error('Fallback suggestions error:', fallbackError);
        return NextResponse.json({ suggestions: [] });
      }

      if (!fallbackSuggestions || fallbackSuggestions.length === 0) {
        return NextResponse.json({ suggestions: [] });
      }

      // Use fallback suggestions
      const scoredFallbackSuggestions = fallbackSuggestions.map((suggestion: any) => ({
        ...suggestion,
        score: 10, // Base score for fallback
        suggestion_reasons: ['Recently joined platform'],
      }));

      const topFallbackSuggestions = scoredFallbackSuggestions.slice(0, limit);

      // Get connection status and mutual connections for fallback suggestions
      const fallbackWithDetails = await Promise.all(
        topFallbackSuggestions.map(async (suggestion: any) => {
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
            suggestion_reasons: suggestion.suggestion_reasons,
            suggestion_score: suggestion.score,
          };
        })
      );

      return NextResponse.json({
        suggestions: fallbackWithDetails,
      });
    }

    // Score each suggestion based on similarity
    const scoredSuggestions = await Promise.all(potentialSuggestions.map(async (suggestion: any) => {
      let score = 0;
      const reasons = [];

      // Fetch user stats separately to avoid foreign key issues
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('total_solved, current_streak, contest_rating')
        .eq('user_id', suggestion.user_id)
        .single();

      // Same university: +100 points (exact match)
      if (suggestion.university && suggestion.university === currentUserProfile.university) {
        score += 100;
        reasons.push('Same university');
      }
      // Similar university: +50 points (fuzzy match)
      else if (suggestion.university && currentUserProfile.university) {
        const suggestionUni = suggestion.university.toLowerCase();
        const currentUni = currentUserProfile.university.toLowerCase();
        
        // Check for partial matches or common variations
        if (suggestionUni.includes(currentUni) || currentUni.includes(suggestionUni)) {
          score += 50;
          reasons.push('Similar university');
        }
        // Check for common university name variations
        else if (
          (suggestionUni.includes('state') && currentUni.includes('state')) ||
          (suggestionUni.includes('university') && currentUni.includes('university')) ||
          (suggestionUni.includes('college') && currentUni.includes('college'))
        ) {
          score += 30;
          reasons.push('Similar university type');
        }
      }

      // Same graduation year: +50 points
      if (suggestion.graduation_year && suggestion.graduation_year === currentUserProfile.graduation_year) {
        score += 50;
        reasons.push('Same graduation year');
      }

      // Similar problem-solving level (within 50 problems): +75 points
      if (userStats && currentUserStats) {
        const solvedDiff = Math.abs((userStats.total_solved || 0) - (currentUserStats.total_solved || 0));
        if (solvedDiff <= 50) {
          score += 75;
          reasons.push('Similar skill level');
        } else if (solvedDiff <= 100) {
          score += 30;
        }

        // Similar contest rating (within 200 points): +50 points
        const ratingDiff = Math.abs((userStats.contest_rating || 0) - (currentUserStats.contest_rating || 0));
        if (ratingDiff <= 200) {
          score += 50;
          reasons.push('Similar contest rating');
        } else if (ratingDiff <= 400) {
          score += 25;
        }
      }

      // Active users (has submissions): +25 points
      if (userStats && userStats.total_solved > 0) {
        score += 25;
        reasons.push('Active problem solver');
      }

      // Users with profile info: +10 points
      if (suggestion.bio) {
        score += 10;
        reasons.push('Complete profile');
      }

      // Recency bonus (newer users get slight priority)
      const daysSinceCreated = Math.floor((Date.now() - new Date(suggestion.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated <= 30) {
        score += 15;
        reasons.push('Recently joined');
      }

      // Prioritize suggestion reasons by relevance
      const prioritizedReasons = [];
      
      // University-related reasons (highest priority)
      if (reasons.includes('Same university')) {
        prioritizedReasons.push('Same university');
      } else if (reasons.includes('Similar university')) {
        prioritizedReasons.push('Similar university');
      } else if (reasons.includes('Similar university type')) {
        prioritizedReasons.push('Similar university type');
      }
      
      // Graduation year (high priority)
      if (reasons.includes('Same graduation year')) {
        prioritizedReasons.push('Same graduation year');
      }
      
      // Platform-related reasons (medium priority)
      if (reasons.includes('Similar skill level')) {
        prioritizedReasons.push('Similar skill level');
      }
      if (reasons.includes('Similar contest rating')) {
        prioritizedReasons.push('Similar contest rating');
      }
      if (reasons.includes('Active problem solver')) {
        prioritizedReasons.push('Active problem solver');
      }
      
      // Profile completeness (lower priority)
      if (reasons.includes('Complete profile')) {
        prioritizedReasons.push('Complete profile');
      }
      if (reasons.includes('Recently joined')) {
        prioritizedReasons.push('Recently joined');
      }
      
      // Limit to 4 reasons to keep cards consistent
      const finalReasons = prioritizedReasons.slice(0, 4);

      return {
        ...suggestion,
        total_solved: userStats?.total_solved || 0,
        current_streak: userStats?.current_streak || 0,
        contest_rating: userStats?.contest_rating || 0,
        score,
        suggestion_reasons: finalReasons,
      };
    }));

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

        // Add mutual connections to reasons if applicable
        const finalReasons = [...(suggestion.suggestion_reasons || [])];
        if (mutualCount && mutualCount > 0) {
          finalReasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
        }

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
          suggestion_reasons: finalReasons,
          suggestion_score: suggestion.score,
        } as UserSearchResult & { suggestion_reasons: string[], suggestion_score: number };
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
