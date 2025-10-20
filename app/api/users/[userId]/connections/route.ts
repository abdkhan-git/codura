import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/users/[userId]/connections - Get user's connections with privacy
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filterSchool = searchParams.get('school');
    const filterCompany = searchParams.get('company');
    const filterYear = searchParams.get('year');
    const filterLocation = searchParams.get('location');

    const { userId: targetUserId } = await params;

    // Get connections using the database function (handles privacy)
    const { data: connections, error } = await supabase
      .rpc('get_user_connections', {
        p_user_id: targetUserId,
        p_viewer_id: currentUser.id,
        p_limit: limit,
        p_offset: offset
      });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Apply additional filters if provided
    let filteredConnections = connections || [];

    if (filterSchool) {
      filteredConnections = filteredConnections.filter(c =>
        c.university?.toLowerCase().includes(filterSchool.toLowerCase())
      );
    }

    if (filterCompany) {
      filteredConnections = filteredConnections.filter(c =>
        c.company?.toLowerCase().includes(filterCompany.toLowerCase())
      );
    }

    if (filterYear) {
      filteredConnections = filteredConnections.filter(c =>
        c.graduation_year === filterYear
      );
    }

    if (filterLocation) {
      filteredConnections = filteredConnections.filter(c =>
        c.location?.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }

    return NextResponse.json({
      connections: filteredConnections,
      total: filteredConnections.length,
      has_access: filteredConnections.length > 0 || targetUserId === currentUser.id
    });
  } catch (error) {
    console.error('Connections API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
