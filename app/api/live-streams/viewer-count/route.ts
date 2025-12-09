import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { streamId, viewerCount } = body

    if (!streamId || viewerCount === undefined) {
      return NextResponse.json(
        { error: 'streamId and viewerCount are required' },
        { status: 400 }
      )
    }

    // Update viewer count
    const { data, error } = await supabase
      .from('live_streams')
      .update({
        viewer_count: viewerCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streamId)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating viewer count:', error)
      return NextResponse.json(
        { error: 'Failed to update viewer count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ stream: data })
  } catch (error) {
    console.error('Error in viewer count endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

