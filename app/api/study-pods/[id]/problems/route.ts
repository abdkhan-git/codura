import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/problems
 * Get all assigned problems for a pod with completion status
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
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to view problems' },
        { status: 403 }
      );
    }

    // Get assigned problems with problem details
    const { data: podProblems, error: problemsError } = await supabase
      .from('study_pod_problems')
      .select('*')
      .eq('pod_id', podId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });

    if (problemsError) {
      console.error('Error fetching pod problems:', problemsError);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    // Get problem details
    const problemIds = podProblems?.map(p => p.problem_id) || [];
    let problemDetails: any[] = [];

    if (problemIds.length > 0) {
      const { data: problems } = await supabase
        .from('problems')
        .select('id, leetcode_id, title, title_slug, difficulty, topic_tags, acceptance_rate')
        .in('id', problemIds);

      problemDetails = problems || [];
    }

    // Get all completions for these problems
    const podProblemIds = podProblems?.map(p => p.id) || [];
    let completions: any[] = [];

    if (podProblemIds.length > 0) {
      const { data: completionData } = await supabase
        .from('study_pod_problem_completions')
        .select('pod_problem_id, user_id, completed_at, time_taken_minutes')
        .in('pod_problem_id', podProblemIds);

      completions = completionData || [];
    }

    // Get user details for completions
    const completionUserIds = [...new Set(completions.map(c => c.user_id))];
    let usersData: any[] = [];

    if (completionUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', completionUserIds);

      usersData = users || [];
    }

    // Get assigners
    const assignerIds = [...new Set(podProblems?.map(p => p.assigned_by) || [])];
    let assigners: any[] = [];

    if (assignerIds.length > 0) {
      const { data: assignerData } = await supabase
        .from('users')
        .select('user_id, username, full_name')
        .in('user_id', assignerIds);

      assigners = assignerData || [];
    }

    // Enrich pod problems with details and completion info
    const enrichedProblems = podProblems?.map(podProblem => {
      const problem = problemDetails.find(p => p.id === podProblem.problem_id);
      const problemCompletions = completions
        .filter(c => c.pod_problem_id === podProblem.id)
        .map(c => ({
          ...c,
          user: usersData.find(u => u.user_id === c.user_id),
        }));

      const userCompleted = problemCompletions.some(c => c.user_id === user.id);
      const assigner = assigners.find(a => a.user_id === podProblem.assigned_by);

      return {
        ...podProblem,
        problem,
        completions: problemCompletions,
        completion_count: problemCompletions.length,
        user_completed: userCompleted,
        assigned_by_user: assigner,
      };
    }) || [];

    return NextResponse.json({
      problems: enrichedProblems,
      total: enrichedProblems.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching pod problems:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/[id]/problems
 * Assign a new problem to the pod (owner/moderator only)
 */
export async function POST(
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

    // Check if user is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can assign problems' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { problem_ids, deadline, notes, priority } = body;

    if (!problem_ids || !Array.isArray(problem_ids) || problem_ids.length === 0) {
      return NextResponse.json(
        { error: 'problem_ids array is required' },
        { status: 400 }
      );
    }

    // Assign problems
    const problemsToInsert = problem_ids.map(problemId => ({
      pod_id: podId,
      problem_id: problemId,
      assigned_by: user.id,
      deadline: deadline || null,
      notes: notes || null,
      priority: priority || 'medium',
      status: 'active',
    }));

    const { data: assignedProblems, error: insertError } = await supabase
      .from('study_pod_problems')
      .insert(problemsToInsert)
      .select();

    if (insertError) {
      console.error('Error assigning problems:', insertError);

      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'One or more problems are already assigned to this pod' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to assign problems' },
        { status: 500 }
      );
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'announcement',
      title: 'Problems assigned',
      description: `${problem_ids.length} problem(s) assigned to the pod`,
    });

    return NextResponse.json({
      success: true,
      problems: assignedProblems,
      message: `Successfully assigned ${problem_ids.length} problem(s)`,
    });
  } catch (error) {
    console.error('Unexpected error assigning problems:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
