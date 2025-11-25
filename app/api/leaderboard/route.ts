import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { LeaderboardEntry } from '@/types/database';

export const revalidate = 60; // Cache for 60 seconds
export const dynamic = 'force-dynamic';

/**
 * Leaderboard API - Returns ranked users from the same school
 * Filters by federal_school_code and only shows public profiles
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile to find their federal_school_code
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('federal_school_code')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // If user doesn't have a school code, return empty leaderboard
    if (!currentUserProfile?.federal_school_code) {
      return NextResponse.json({
        leaderboard: [],
        userRank: null,
        totalUsers: 0,
        schoolCode: null,
        message: 'No school affiliation found. Update your profile to see your school leaderboard.'
      });
    }

    const schoolCode = currentUserProfile.federal_school_code;

    // Fetch all public users from the same school
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url, federal_school_code, is_public')
      .eq('federal_school_code', schoolCode)
      .eq('is_public', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        userRank: null,
        totalUsers: 0,
        schoolCode,
        message: null
      });
    }

    // Get user IDs
    const userIds = usersData.map(u => u.user_id);

    // Fetch stats for all those users
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, total_solved, easy_solved, medium_solved, hard_solved, current_streak, total_points, contest_rating')
      .in('user_id', userIds);

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Create a map of user_id to stats
    const statsMap = new Map(
      (statsData || []).map(stat => [stat.user_id, stat])
    );

    // Combine users and stats
    const rankedLeaderboard: LeaderboardEntry[] = usersData
      .map((user: any) => {
        const stats = statsMap.get(user.user_id);
        if (!stats || stats.total_solved === 0) {
          return null; // Filter out users with no stats or no solved problems
        }
        return {
          user_id: user.user_id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          federal_school_code: user.federal_school_code,
          total_solved: stats.total_solved || 0,
          easy_solved: stats.easy_solved || 0,
          medium_solved: stats.medium_solved || 0,
          hard_solved: stats.hard_solved || 0,
          current_streak: stats.current_streak || 0,
          total_points: stats.total_points || 0,
          contest_rating: stats.contest_rating || 0,
          rank: 0, // Will be assigned below
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((a: any, b: any) => {
        // Primary sort: total_solved (descending)
        if (b.total_solved !== a.total_solved) {
          return b.total_solved - a.total_solved;
        }
        // Secondary sort: total_points (descending)
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        // Tertiary sort: contest_rating (descending)
        return b.contest_rating - a.contest_rating;
      })
      .map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
      }));

    // Find current user's rank
    const userRank = rankedLeaderboard.find(entry => entry.user_id === user.id)?.rank || null;

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      userRank,
      totalUsers: rankedLeaderboard.length,
      schoolCode,
      message: null
    });

  } catch (error) {
    console.error('Unexpected error in leaderboard API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
