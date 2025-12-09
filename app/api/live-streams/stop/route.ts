import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update all active streams for this user
    const { data, error } = await supabase
      .from('live_streams')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('streamer_id', user.id)
      .eq('is_active', true)
      .select()

    if (error) {
      console.error('Error stopping live stream:', error)
      return NextResponse.json(
        { error: 'Failed to stop stream' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, streams: data })
  } catch (error) {
    console.error('Error in stop stream endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

