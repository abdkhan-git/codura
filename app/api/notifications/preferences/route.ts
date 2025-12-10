import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user notification preferences
    const { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default preferences if none exist
    const defaultPreferences = {
      user_id: user.id,
      email_notifications: true,
      push_notifications: true,
      connection_requests: true,
      connection_accepted: true,
      activity_reactions: true,
      activity_comments: true,
      study_plan_shares: true,
      achievement_milestones: true,
      system_announcements: true,
      digest_frequency: 'daily',
      quiet_hours_start: null,
      quiet_hours_end: null
    };

    return NextResponse.json({
      preferences: preferences || defaultPreferences
    });

  } catch (error) {
    console.error('Get notification preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email_notifications,
      push_notifications,
      connection_requests,
      connection_accepted,
      activity_reactions,
      activity_comments,
      study_plan_shares,
      achievement_milestones,
      system_announcements,
      digest_frequency,
      quiet_hours_start,
      quiet_hours_end
    } = body;

    // Check if preferences exist
    const { data: existingPreferences } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    const preferencesData = {
      user_id: user.id,
      email_notifications,
      push_notifications,
      connection_requests,
      connection_accepted,
      activity_reactions,
      activity_comments,
      study_plan_shares,
      achievement_milestones,
      system_announcements,
      digest_frequency,
      quiet_hours_start,
      quiet_hours_end,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingPreferences) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(preferencesData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert(preferencesData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification preferences:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      preferences: result 
    });

  } catch (error) {
    console.error('Update notification preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
