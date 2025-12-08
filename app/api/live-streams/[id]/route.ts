import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: streamId } = await params

    // Fetch stream by ID
    const { data: stream, error: streamError } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .eq('is_active', true)
      .single()

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found or inactive' },
        { status: 404 }
      )
    }

    // Fetch problem details
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('id, title, title_slug, difficulty, topic_tags, description')
      .eq('id', stream.problem_id)
      .single()

    if (problemError) {
      console.error('Error fetching problem:', problemError)
      return NextResponse.json(
        { error: 'Failed to fetch problem details' },
        { status: 500 }
      )
    }

    // Fetch streamer profile
    const { data: streamer, error: streamerError } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .eq('user_id', stream.streamer_id)
      .single()

    if (streamerError) {
      console.error('Error fetching streamer:', streamerError)
      // Continue without streamer info
    }

    return NextResponse.json({
      stream: {
        ...stream,
        problems: problem || null,
        streamer: streamer ? {
          id: streamer.user_id,
          full_name: streamer.full_name,
          username: streamer.username,
          avatar_url: streamer.avatar_url,
        } : null,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/live-streams/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

