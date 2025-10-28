import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unread_only = searchParams.get('unread_only') === 'true';

    // Build query - fix the foreign key reference
    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        notification_type,
        title,
        message,
        link,
        read,
        priority,
        metadata,
        created_at,
        actor_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread_only) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      // Check if it's a table doesn't exist error
      if (error.code === 'PGRST116' || error.message.includes('relation "notifications" does not exist')) {
        return NextResponse.json({ 
          error: 'Notifications table not found. Please run database migrations.',
          notifications: [],
          pagination: { limit, offset, total: 0, hasMore: false }
        }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch actor information separately to avoid foreign key issues
    const notificationsWithActors = await Promise.all(
      (notifications || []).map(async (notification) => {
        if (notification.actor_id) {
          const { data: actorData } = await supabase
            .from('users')
            .select('user_id, full_name, username, avatar_url')
            .eq('user_id', notification.actor_id)
            .single();
          
          return {
            ...notification,
            actor: actorData
          };
        }
        return {
          ...notification,
          actor: null
        };
      })
    );

    // Get total count
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (unread_only) {
      countQuery = countQuery.eq('read', false);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting notification count:', countError);
    }

    return NextResponse.json({
      notifications: notificationsWithActors || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      user_id,
      actor_id,
      type,
      notification_type,
      title,
      message,
      link,
      priority = 'normal',
      metadata = {}
    } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'User ID, type, and title are required' }, { status: 400 });
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        actor_id,
        type,
        notification_type: notification_type || type,
        title,
        message,
        link,
        priority,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Create notification API error:', error);
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
    const { notification_ids, read } = body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({ error: 'Notification IDs array is required' }, { status: 400 });
    }

    // Update notifications
    const { error } = await supabase
      .from('notifications')
      .update({ read })
      .in('id', notification_ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Update notifications API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
