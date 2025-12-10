import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/problems/[problemId]/complete
 * Mark a problem as completed by the current user
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const supabase = await createClient();
    const { problemId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the problem to check membership
    const { data: podProblem } = await supabase
      .from('study_pod_problems')
      .select('pod_id, status')
      .eq('id', problemId)
      .single();

    if (!podProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    if (podProblem.status !== 'active') {
      return NextResponse.json(
        { error: 'This problem is no longer active' },
        { status: 400 }
      );
    }

    // Check if user is a member of the pod
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podProblem.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a member of this pod to complete problems' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { time_taken_minutes, notes, solution_link } = body;

    // Check if already completed
    const { data: existingCompletion } = await supabase
      .from('study_pod_problem_completions')
      .select('id')
      .eq('pod_problem_id', problemId)
      .eq('user_id', user.id)
      .single();

    if (existingCompletion) {
      // Update existing completion
      const { error: updateError } = await supabase
        .from('study_pod_problem_completions')
        .update({
          time_taken_minutes: time_taken_minutes || null,
          notes: notes || null,
          solution_link: solution_link || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existingCompletion.id);

      if (updateError) {
        console.error('Error updating completion:', updateError);
        return NextResponse.json(
          { error: 'Failed to update completion' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Problem completion updated',
      });
    }

    // Create new completion
    const { error: insertError } = await supabase
      .from('study_pod_problem_completions')
      .insert({
        pod_problem_id: problemId,
        user_id: user.id,
        time_taken_minutes: time_taken_minutes || null,
        notes: notes || null,
        solution_link: solution_link || null,
      });

    if (insertError) {
      console.error('Error creating completion:', insertError);
      return NextResponse.json(
        { error: 'Failed to mark problem as complete' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Problem marked as complete',
    });
  } catch (error) {
    console.error('Unexpected error completing problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/problems/[problemId]/complete
 * Remove completion status for a problem (unmark as complete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const supabase = await createClient();
    const { problemId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the completion
    const { error: deleteError } = await supabase
      .from('study_pod_problem_completions')
      .delete()
      .eq('pod_problem_id', problemId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting completion:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove completion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Problem completion removed',
    });
  } catch (error) {
    console.error('Unexpected error removing completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
