import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateUsernamesForExistingUsers } from '@/lib/username-generator';

/**
 * Admin endpoint to generate usernames for all users without one
 * POST /api/admin/generate-usernames
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optional: Add admin check here if you have admin roles
    // const { data: profile } = await supabase
    //   .from('users')
    //   .select('role')
    //   .eq('user_id', user.id)
    //   .single();
    //
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Forbidden: Admin access required' },
    //     { status: 403 }
    //   );
    // }

    console.log('Starting username generation for existing users...');

    // Generate usernames for all users without one
    const result = await generateUsernamesForExistingUsers();

    return NextResponse.json({
      success: true,
      message: `Username generation complete`,
      stats: {
        successful: result.success,
        failed: result.failed,
        total: result.success + result.failed,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in generate-usernames endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get status of users without usernames
 * GET /api/admin/generate-usernames
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Count users without usernames
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('username', null);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      usersWithoutUsername: count || 0,
    });
  } catch (error: any) {
    console.error('Error checking username status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
