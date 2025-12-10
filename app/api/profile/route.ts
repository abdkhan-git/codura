import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { calculateStreaks } from '@/utils/streak-calculator';

// Add caching for better performance
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // Ensure fresh data for authenticated users

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unified user profile from users table
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // If no profile exists, create one (trigger will auto-create user_stats)
    if (!profile) {
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      const { data: newProfile, error: createProfileError } = await supabase
        .from('users')
        .insert({
          user_id: user.id,
          full_name: fullName,
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (createProfileError) {
        return NextResponse.json({ error: createProfileError.message }, { status: 500 });
      }

      profile = newProfile;
    }

    // Get user stats (should exist due to trigger, but check anyway)
    let { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (statsError) {
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // If stats still don't exist (edge case), create them
    if (!stats) {
      const { data: newStats, error: createStatsError } = await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          current_streak: profile.day_streak || 0,
        })
        .select()
        .single();

      if (createStatsError) {
        console.error('Failed to create stats:', createStatsError);
      } else {
        stats = newStats;
      }
    }

    // Get ALL submissions for contribution grid (past year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .gte('submitted_at', oneYearAgo.toISOString())
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }

    // Calculate current streak dynamically
    const { currentStreak, longestStreak } = calculateStreaks(submissions || []);

    // Update stats with calculated streaks
    if (stats) {
      stats.current_streak = currentStreak;
      stats.longest_streak = Math.max(longestStreak, stats.longest_streak || 0);

      // Update the database with the new streak values
      await supabase
        .from('user_stats')
        .update({
          current_streak: currentStreak,
          longest_streak: Math.max(longestStreak, stats.longest_streak || 0)
        })
        .eq('user_id', user.id);
    }

    // Get user achievements with achievement details (using optimized view)
    const { data: userAchievements, error: achievementsError } = await supabase
      .from('user_achievements_with_details')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (achievementsError) {
      return NextResponse.json({ error: achievementsError.message }, { status: 500 });
    }

    // Get achievement summary using the database function
    const { data: achievementSummary, error: summaryError } = await supabase
      .rpc('get_user_achievement_summary', { p_user_id: user.id })
      .single();

    if (summaryError) {
      console.error('Failed to fetch achievement summary:', summaryError);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: profile?.created_at || null,
      },
      profile: profile || null,
      stats: stats || null,
      submissions: submissions || [],
      achievements: userAchievements || [],
      achievementSummary: achievementSummary || {
        total_achievements: 0,
        latest_achievement_name: null,
        latest_achievement_date: null,
        achievement_progress: []
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and sanitize input
    const {
      username,
      full_name,
      bio,
      avatar_url,
      university,
      graduation_year,
      location,
      job_title,
      website,
      github_username,
      linkedin_username,
      is_public,
    } = body;

    // Check if username is already taken (if changed)
    if (username) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', username)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
    }

    // Update unified users table (trigger will update timestamp)
    const { data, error } = await supabase
      .from('users')
      .update({
        username,
        full_name,
        bio,
        avatar_url,
        university,
        graduation_year,
        location,
        job_title,
        website,
        github_username,
        linkedin_username,
        is_public,
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
