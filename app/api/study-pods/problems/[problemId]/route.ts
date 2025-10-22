import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/study-pods/problems/[problemId]
 * Remove an assigned problem (owner/moderator only)
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

    // Get the problem to check permissions
    const { data: podProblem } = await supabase
      .from('study_pod_problems')
      .select('pod_id')
      .eq('id', problemId)
      .single();

    if (!podProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if user is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podProblem.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can remove problems' },
        { status: 403 }
      );
    }

    // Delete the problem (cascades to completions)
    const { error: deleteError } = await supabase
      .from('study_pod_problems')
      .delete()
      .eq('id', problemId);

    if (deleteError) {
      console.error('Error deleting problem:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove problem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Problem removed from pod',
    });
  } catch (error) {
    console.error('Unexpected error removing problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/problems/[problemId]
 * Update problem details (deadline, notes, priority)
 */
export async function PATCH(
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

    // Get the problem to check permissions
    const { data: podProblem } = await supabase
      .from('study_pod_problems')
      .select('pod_id')
      .eq('id', problemId)
      .single();

    if (!podProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if user is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podProblem.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can update problems' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { deadline, notes, priority, status } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (deadline !== undefined) updates.deadline = deadline;
    if (notes !== undefined) updates.notes = notes;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;

    // Update the problem
    const { error: updateError } = await supabase
      .from('study_pod_problems')
      .update(updates)
      .eq('id', problemId);

    if (updateError) {
      console.error('Error updating problem:', updateError);
      return NextResponse.json(
        { error: 'Failed to update problem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Problem updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error updating problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
