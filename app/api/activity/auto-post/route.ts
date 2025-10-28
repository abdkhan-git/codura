import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId, postType, content, metadata } = await request.json();

    // Get user's privacy settings for activity sharing
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('share_problem_solved, share_achievements, share_streaks, share_study_plans')
      .eq('user_id', user.id)
      .single();

    // Check if user wants to share this type of activity
    const shouldShare = (() => {
      switch (postType) {
        case 'problem_solved':
          return privacySettings?.share_problem_solved !== false; // Default to true
        case 'achievement_earned':
          return privacySettings?.share_achievements !== false; // Default to true
        case 'streak_milestone':
          return privacySettings?.share_streaks !== false; // Default to true
        case 'study_plan_shared':
          return privacySettings?.share_study_plans !== false; // Default to true
        default:
          return false;
      }
    })();

    if (!shouldShare) {
      return NextResponse.json({ message: 'Activity sharing disabled for this type' });
    }

    // Create social post from activity
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: content || getDefaultContent(postType, metadata),
        post_type: postType,
        metadata: {
          ...metadata,
          auto_generated: true,
          source_activity_id: activityId
        },
        is_public: true
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating auto-post:', postError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error in auto-post creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDefaultContent(postType: string, metadata: any): string {
  switch (postType) {
    case 'problem_solved':
      return `Just solved "${metadata.problem_title}" (${metadata.difficulty})! 🎯`;
    case 'achievement_earned':
      return `Earned the "${metadata.achievement_name}" achievement! 🏆`;
    case 'streak_milestone':
      return `Hit a ${metadata.streak_days}-day study streak! 🔥`;
    case 'study_plan_shared':
      return `Shared my study plan: "${metadata.plan_title}" 📚`;
    default:
      return 'Check out my latest activity!';
  }
}
