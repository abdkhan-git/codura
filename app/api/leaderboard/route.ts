import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { LeaderboardEntry } from '@/types/database';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/**
 * Leaderboard API - Returns paginated, DB-sorted ranked users from a school.
 * Query params:
 *  - school_code (optional): view another school's leaderboard
 *  - page (optional, default 1): which page of results
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedSchoolCode = searchParams.get('school_code');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Fetch current user's school in parallel with nothing yet — just their profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('federal_school_code')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const schoolCode = requestedSchoolCode || currentUserProfile?.federal_school_code;

    if (!schoolCode) {
      return NextResponse.json({
        leaderboard: [],
        userRank: null,
        totalUsers: 0,
        schoolCode: null,
        isOwnSchool: false,
        page,
        totalPages: 0,
        message: 'No school affiliation found. Update your profile to see your school leaderboard.'
      });
    }

    const isOwnSchool = schoolCode === currentUserProfile?.federal_school_code;

    // Step 1: Get only the public user_ids for this school (IDs only — minimal data transfer)
    const { data: schoolUsers, error: schoolUsersError } = await supabase
      .from('users')
      .select('user_id')
      .eq('federal_school_code', schoolCode)
      .eq('is_public', true);

    if (schoolUsersError) {
      return NextResponse.json({ error: 'Failed to fetch school users' }, { status: 500 });
    }
    if (!schoolUsers || schoolUsers.length === 0) {
      return NextResponse.json({
        leaderboard: [], userRank: null, totalUsers: 0,
        schoolCode, isOwnSchool, page, totalPages: 0, message: null
      });
    }

    const schoolUserIds = schoolUsers.map(u => u.user_id);

    // Step 2: Fetch paginated stats sorted at the DB level — only PAGE_SIZE rows come back
    const { data: statsPage, error: statsError, count } = await supabase
      .from('user_stats')
      .select('user_id, total_solved, easy_solved, medium_solved, hard_solved, current_streak, total_points, contest_rating', { count: 'exact' })
      .in('user_id', schoolUserIds)
      .gt('total_solved', 0)
      .order('total_solved', { ascending: false })
      .order('total_points', { ascending: false })
      .order('contest_rating', { ascending: false })
      .range(from, to);

    if (statsError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
    if (!statsPage || statsPage.length === 0) {
      return NextResponse.json({
        leaderboard: [], userRank: null, totalUsers: count ?? 0,
        schoolCode, isOwnSchool, page, totalPages: 0, message: null
      });
    }

    // Step 3: Fetch profiles for only the PAGE_SIZE users we got back
    const pageUserIds = statsPage.map(s => s.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url, federal_school_code')
      .in('user_id', pageUserIds);

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    const leaderboard: LeaderboardEntry[] = statsPage.map((stat, index) => {
      const profile = profileMap.get(stat.user_id);
      return {
        user_id: stat.user_id,
        username: profile?.username ?? '',
        full_name: profile?.full_name ?? '',
        avatar_url: profile?.avatar_url ?? null,
        federal_school_code: profile?.federal_school_code ?? schoolCode,
        total_solved: stat.total_solved ?? 0,
        easy_solved: stat.easy_solved ?? 0,
        medium_solved: stat.medium_solved ?? 0,
        hard_solved: stat.hard_solved ?? 0,
        current_streak: stat.current_streak ?? 0,
        total_points: stat.total_points ?? 0,
        contest_rating: stat.contest_rating ?? 0,
        rank: from + index + 1,
      };
    });

    // Step 4: Determine current user's rank — count users ahead of them at the DB level
    let userRank: number | null = null;
    const userStatInPage = leaderboard.find(e => e.user_id === user.id);
    if (userStatInPage) {
      userRank = userStatInPage.rank;
    } else {
      // User not on this page — count how many school members beat them
      const { data: currentUserStat } = await supabase
        .from('user_stats')
        .select('total_solved, total_points, contest_rating')
        .eq('user_id', user.id)
        .single();

      if (currentUserStat && currentUserStat.total_solved > 0) {
        const { count: ahead } = await supabase
          .from('user_stats')
          .select('user_id', { count: 'exact', head: true })
          .in('user_id', schoolUserIds)
          .gt('total_solved', currentUserStat.total_solved);

        userRank = (ahead ?? 0) + 1;
      }
    }

    const totalUsers = count ?? 0;
    const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

    return NextResponse.json({
      leaderboard,
      userRank,
      totalUsers,
      schoolCode,
      isOwnSchool,
      page,
      totalPages,
      message: null
    });

  } catch (error) {
    console.error('Unexpected error in leaderboard API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
