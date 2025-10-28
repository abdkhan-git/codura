import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', settingsError);
      return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 });
    }

    // Return default settings if none exist
    const defaultSettings = {
      user_id: user.id,
      message_notifications: true,
      group_invites: true,
      connection_requests: true,
      study_pod_updates: true,
      achievement_notifications: true,
      email_notifications: true,
      push_notifications: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      settings: settings || defaultSettings
    });

  } catch (error) {
    console.error('Error in fetch notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const settings = await request.json();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate settings
    const validSettings = {
      message_notifications: Boolean(settings.message_notifications),
      group_invites: Boolean(settings.group_invites),
      connection_requests: Boolean(settings.connection_requests),
      study_pod_updates: Boolean(settings.study_pod_updates),
      achievement_notifications: Boolean(settings.achievement_notifications),
      email_notifications: Boolean(settings.email_notifications),
      push_notifications: Boolean(settings.push_notifications),
      quiet_hours_enabled: Boolean(settings.quiet_hours_enabled),
      quiet_hours_start: settings.quiet_hours_start || '22:00',
      quiet_hours_end: settings.quiet_hours_end || '08:00',
      timezone: settings.timezone || 'UTC'
    };

    // Upsert notification settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...validSettings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notification settings:', updateError);
      return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings
    });

  } catch (error) {
    console.error('Error in update notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
