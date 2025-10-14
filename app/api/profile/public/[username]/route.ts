import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { calculateStreaks } from '@/utils/streak-calculator';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const { username } = await params;

    // Get user by username - include is_public field
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url, bio, location, job_title, university, graduation_year, github_username, linkedin_username, website, is_public, created_at')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.user_id;
    const isPublic = userData.is_public ?? true; // Default to public if not set

    // Fetch user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
    }

    // Fetch recent submissions (limit to 50 for public view)
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
    }

    console.log('=== Public Profile Debug ===');
    console.log('Username:', username);
    console.log('User ID:', userId);
    console.log('Submissions count:', submissions?.length || 0);
    if (submissions && submissions.length > 0) {
      console.log('Sample submission:', {
        problem: submissions[0].problem_title,
        status: submissions[0].status,
        date: submissions[0].submitted_at
      });
    }
    console.log('===========================');

    // Calculate actual streak based on submissions
    const { currentStreak: actualCurrentStreak, longestStreak: calculatedLongestStreak } = calculateStreaks(submissions || []);
    const actualLongestStreak = Math.max(calculatedLongestStreak, stats?.longest_streak || 0);

    // Fetch public lists only
    const { data: userLists, error: listsError } = await supabase
      .from('user_problem_lists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: true });

    if (listsError) {
      console.error('Error fetching user lists:', listsError);
    }

    // Get problem counts and solved counts for each public list
    const publicListsWithCounts = await Promise.all(
      (userLists || []).map(async (list) => {
        // Get total problem count
        const { count: problemCount } = await supabase
          .from('user_list_problems')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);

        // Get solved count for the list owner
        const { data: solvedProblems } = await supabase
          .from('user_list_problems')
          .select('problem_id, user_problem_progress!inner(status)')
          .eq('list_id', list.id)
          .eq('user_problem_progress.user_id', userId)
          .eq('user_problem_progress.status', 'Solved');

        return {
          ...list,
          problem_count: problemCount || 0,
          solved_count: solvedProblems?.length || 0
        };
      })
    );

    // Fetch achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select(`
        achievement_id,
        earned_at,
        achievements (
          name,
          description,
          icon,
          color,
          requirement_type,
          requirement_value
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
    }

    // Format achievements
    const formattedAchievements = (achievements || []).map((ua: any) => ({
      achievement_id: ua.achievement_id,
      name: ua.achievements.name,
      description: ua.achievements.description,
      icon: ua.achievements.icon,
      color: ua.achievements.color,
      earned_at: ua.earned_at,
      requirement_type: ua.achievements.requirement_type,
      requirement_value: ua.achievements.requirement_value,
    }));

    // For private profiles, only return top 3 achievements
    const achievementsToReturn = isPublic 
      ? formattedAchievements 
      : formattedAchievements.slice(0, 3);

    // Calculate achievement summary
    const achievementSummary = {
      total_achievements: formattedAchievements.length,
      latest_achievement_name: formattedAchievements[0]?.name || null,
      latest_achievement_date: formattedAchievements[0]?.earned_at || null,
      achievement_progress: formattedAchievements,
    };

    // Prepare stats object (always visible with aggregate data)
    const statsData = stats ? {
      ...stats,
      current_streak: actualCurrentStreak,
      longest_streak: actualLongestStreak,
    } : {
      user_id: userId,
      total_solved: 0,
      easy_solved: 0,
      medium_solved: 0,
      hard_solved: 0,
      current_streak: actualCurrentStreak,
      longest_streak: actualLongestStreak,
      total_submissions: 0,
    };

    // For private profiles, return limited data but with indicators
    return NextResponse.json({
      profile: {
        ...userData,
        is_public: isPublic,
      },
      stats: statsData,
      // Submissions: return all for contribution graph, but frontend will handle display
      submissions: submissions || [],
      // Achievements: full for public, top 3 for private
      achievements: achievementsToReturn,
      achievementSummary: {
        ...achievementSummary,
        // Total count is always visible
        total_achievements: formattedAchievements.length,
      },
      publicLists: publicListsWithCounts,
      isPrivate: !isPublic, // Helper flag for frontend
    });
  } catch (error) {
    console.error('Error in public profile GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
