import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1M';

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);
    let groupBy: 'day' | 'week' | 'month' = 'day';

    switch (timeframe) {
      case '1D':
        // Last 24 hours, group by hour
        startDate.setHours(now.getHours() - 24);
        groupBy = 'day';
        break;
      case '1W':
        // Last 7 days
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'day';
        break;
      case '1M':
        // Last 30 days
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'day';
        break;
      case '3M':
        // Last 90 days, group by week
        startDate.setDate(now.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'week';
        break;
      case 'YTD':
        // Year to date
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'month';
        break;
      case 'ALL':
        // All time - get user's first submission date
        const { data: firstSubmission } = await supabase
          .from('submissions')
          .select('submitted_at')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: true })
          .limit(1)
          .single();

        if (firstSubmission) {
          startDate = new Date(firstSubmission.submitted_at);
        } else {
          // If no submissions, use account creation date
          startDate = new Date(user.created_at);
        }
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'month';
        break;
    }

    // Fetch submissions grouped by date
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('submitted_at, status')
      .eq('user_id', user.id)
      .eq('status', 'Accepted')
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString())
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group submissions by time period
    const chartData = processSubmissions(submissions || [], timeframe, groupBy, startDate, endDate);

    return NextResponse.json({ data: chartData, timeframe });
  } catch (error) {
    console.error('Error in activity chart API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function processSubmissions(
  submissions: any[],
  timeframe: string,
  groupBy: 'day' | 'week' | 'month',
  startDate: Date,
  endDate: Date
) {
  // Create a map of dates to submission counts
  const submissionCounts = new Map<string, number>();

  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at);
    let key: string;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      // Get the start of the week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      // Group by month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    submissionCounts.set(key, (submissionCounts.get(key) || 0) + 1);
  });

  // Generate data points for the entire range
  const chartData: { date: string; problems: number; label: string }[] = [];
  const current = new Date(startDate);
  
  // Ensure we start at the beginning of the day for consistent grouping
  if (groupBy === 'day') {
    current.setHours(0, 0, 0, 0);
  }

  while (current <= endDate) {
    let key: string;
    let label: string;

    if (groupBy === 'day') {
      key = current.toISOString().split('T')[0];
      if (timeframe === '1D') {
        label = current.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      } else if (timeframe === '1W') {
        label = current.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      current.setDate(current.getDate() + 1);
    } else if (groupBy === 'week') {
      // Normalize to week start (Sunday) to match the submission grouping logic
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - current.getDay());
      key = weekStart.toISOString().split('T')[0];
      label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      current.setDate(current.getDate() + 7);
    } else {
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      label = current.toLocaleDateString('en-US', { month: 'short' });
      current.setMonth(current.getMonth() + 1);
    }

    chartData.push({
      date: key,
      problems: submissionCounts.get(key) || 0,
      label,
    });
  }

  // Limit data points for better visualization
  if (chartData.length > 100) {
    // Sample the data to show ~50 points
    const step = Math.ceil(chartData.length / 50);
    return chartData.filter((_, index) => index % step === 0);
  }

  return chartData;
}
