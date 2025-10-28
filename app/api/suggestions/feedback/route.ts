import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/suggestions/feedback
 * Submit feedback on suggestion quality
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { suggested_user_id, feedback_type } = await request.json();

    if (!suggested_user_id || !feedback_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(feedback_type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Store feedback in database (you might want to create a suggestions_feedback table)
    // For now, we'll just log it or store in a simple way
    const { error: insertError } = await supabase
      .from('user_activities')
      .insert({
        user_id: user.id,
        activity_type: 'suggestion_feedback',
        metadata: {
          suggested_user_id,
          feedback_type,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('Error storing feedback:', insertError);
      // Don't fail the request if we can't store feedback
    }

    return NextResponse.json({ 
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
