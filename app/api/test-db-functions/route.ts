import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test if the functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .in('routine_name', ['get_social_feed_final', 'create_post', 'create_activity']);

    if (functionsError) {
      console.error('Error checking functions:', functionsError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: functionsError.message,
        functions: null
      }, { status: 500 });
    }

    // Test if we can call the function
    let functionTest = null;
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('get_social_feed_final', {
          p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
          p_limit: 1,
          p_offset: 0,
          p_post_types: null,
          p_connections_only: false
        });
      
      functionTest = {
        success: !testError,
        error: testError?.message || null,
        result: testResult
      };
    } catch (error) {
      functionTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        result: null
      };
    }

    return NextResponse.json({
      status: 'test_complete',
      functions_found: functions || [],
      function_test: functionTest,
      message: 'Database function test completed'
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
