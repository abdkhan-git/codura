import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if key tables exist
    const tables = [
      'notifications',
      'activity_feed', 
      'social_posts',
      'user_notification_preferences'
    ];
    
    const results: { [key: string]: boolean } = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        results[table] = !error;
      } catch (error) {
        results[table] = false;
      }
    }
    
    const allTablesExist = Object.values(results).every(exists => exists);
    
    return NextResponse.json({
      status: allTablesExist ? 'healthy' : 'migrations_needed',
      tables: results,
      message: allTablesExist 
        ? 'All required tables exist' 
        : 'Some tables are missing. Please run database migrations.'
    });
    
  } catch (error) {
    console.error('Migration health check error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to check migration status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
