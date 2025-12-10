import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/statistics
 * Get statistics for a study pod including problems solved this week and difficulty breakdown
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a pod member
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a pod member to view statistics' },
        { status: 403 }
      );
    }

    // Get all pod member user IDs
    const { data: members } = await supabase
      .from('study_pod_members')
      .select('user_id')
      .eq('pod_id', podId)
      .eq('status', 'active');

    if (!members || members.length === 0) {
      return NextResponse.json({
        problemsSolvedThisWeek: [],
        difficultyBreakdown: [],
      });
    }

    const memberUserIds = members.map(m => m.user_id);

    // Calculate date range for "this week" (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Get all accepted submissions from pod members in the last 7 days
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, difficulty, submitted_at, status')
      .in('user_id', memberUserIds)
      .eq('status', 'Accepted')
      .gte('submitted_at', sevenDaysAgo.toISOString())
      .order('submitted_at', { ascending: true });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Process data for "Problems Solved This Week" chart
    // Group by day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const problemsByDay = new Map<string, number>();
    
    // Initialize all days to 0
    dayNames.forEach(day => problemsByDay.set(day, 0));

    submissions?.forEach(sub => {
      const date = new Date(sub.submitted_at);
      const dayName = dayNames[date.getDay()];
      problemsByDay.set(dayName, (problemsByDay.get(dayName) || 0) + 1);
    });

    // Convert to array format for chart (order: Mon-Sun)
    const problemsSolvedThisWeek = [
      { name: 'Mon', solved: problemsByDay.get('Mon') || 0 },
      { name: 'Tue', solved: problemsByDay.get('Tue') || 0 },
      { name: 'Wed', solved: problemsByDay.get('Wed') || 0 },
      { name: 'Thu', solved: problemsByDay.get('Thu') || 0 },
      { name: 'Fri', solved: problemsByDay.get('Fri') || 0 },
      { name: 'Sat', solved: problemsByDay.get('Sat') || 0 },
      { name: 'Sun', solved: problemsByDay.get('Sun') || 0 },
    ];

    // Process data for "Difficulty Breakdown" chart
    const difficultyCounts = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };

    submissions?.forEach(sub => {
      if (sub.difficulty && ['Easy', 'Medium', 'Hard'].includes(sub.difficulty)) {
        difficultyCounts[sub.difficulty as keyof typeof difficultyCounts]++;
      }
    });

    // Always show all difficulties, even if zero
    const difficultyBreakdown = [
      { name: 'Easy', value: difficultyCounts.Easy, color: '#10b981' },
      { name: 'Medium', value: difficultyCounts.Medium, color: '#f59e0b' },
      { name: 'Hard', value: difficultyCounts.Hard, color: '#ef4444' },
    ];

    return NextResponse.json({
      problemsSolvedThisWeek,
      difficultyBreakdown,
    });
  } catch (error) {
    console.error('Error fetching pod statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

