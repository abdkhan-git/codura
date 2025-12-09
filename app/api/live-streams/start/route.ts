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
    const { problemId, roomId } = body

    if (!problemId || !roomId) {
      return NextResponse.json(
        { error: 'problemId and roomId are required' },
        { status: 400 }
      )
    }

    // Check if user already has an active stream
    const { data: existingStream } = await supabase
      .from('live_streams')
      .select('id')
      .eq('streamer_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingStream) {
      // Update existing stream
      const { data, error } = await supabase
        .from('live_streams')
        .update({
          problem_id: problemId,
          room_id: roomId,
          viewer_count: 0,
          started_at: new Date().toISOString(),
          ended_at: null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStream.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating live stream:', error)
        return NextResponse.json(
          { error: 'Failed to update stream' },
          { status: 500 }
        )
      }

      return NextResponse.json({ stream: data })
    } else {
      // Create new stream
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          streamer_id: user.id,
          problem_id: problemId,
          room_id: roomId,
          viewer_count: 0,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating live stream:', error)
        return NextResponse.json(
          { error: 'Failed to create stream' },
          { status: 500 }
        )
      }

      return NextResponse.json({ stream: data })
    }
  } catch (error) {
    console.error('Error in start stream endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

