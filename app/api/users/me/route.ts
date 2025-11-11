import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url, email, bio, location, job_title, university, graduation_year, github_username, linkedin_username, website, is_public, created_at')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.user_id,
      username: profile.username,
      full_name: profile.full_name,
      email: profile.email || user.email,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      location: profile.location,
      job_title: profile.job_title,
      university: profile.university,
      graduation_year: profile.graduation_year,
      github_username: profile.github_username,
      linkedin_username: profile.linkedin_username,
      website: profile.website,
      is_public: profile.is_public,
      created_at: profile.created_at,
    });
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
