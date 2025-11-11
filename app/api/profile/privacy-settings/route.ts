import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching privacy settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        share_problem_solved: true,
        share_achievements: true,
        share_streaks: true,
        share_study_plans: true,
        share_connections: false
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in privacy settings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { share_problem_solved, share_achievements, share_streaks, share_study_plans, share_connections } = body;

    // Upsert privacy settings
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: user.id,
        share_problem_solved,
        share_achievements,
        share_streaks,
        share_study_plans,
        share_connections,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating privacy settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in privacy settings PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
