import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const tag = searchParams.get('tag') || ''

    // First, get all active streams
    const { data: streams, error: streamsError } = await supabase
      .from('live_streams')
      .select('*')
      .eq('is_active', true)
      .order('viewer_count', { ascending: false })
      .order('started_at', { ascending: false })

    if (streamsError) {
      console.error('Error fetching live streams:', streamsError)
      return NextResponse.json(
        { error: 'Failed to fetch streams' },
        { status: 500 }
      )
    }

    if (!streams || streams.length === 0) {
      return NextResponse.json({ streams: [] })
    }

    // Get problem IDs and streamer IDs
    const problemIds = [...new Set(streams.map((s: any) => s.problem_id))]
    const streamerIds = [...new Set(streams.map((s: any) => s.streamer_id))]

    // Fetch problems
    let problemsQuery = supabase
      .from('problems')
      .select('id, title, title_slug, difficulty, topic_tags')
      .in('id', problemIds)

    if (difficulty) {
      problemsQuery = problemsQuery.eq('difficulty', difficulty)
    }

    const { data: problems, error: problemsError } = await problemsQuery

    if (problemsError) {
      console.error('Error fetching problems:', problemsError)
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      )
    }

    // Fetch streamer profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', streamerIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Continue without profiles - they're optional
    }

    // Combine data
    const enrichedStreams = streams
      .map((stream: any) => {
        const problem = problems?.find((p: any) => p.id === stream.problem_id)
        const streamer = profiles?.find((p: any) => p.user_id === stream.streamer_id)

        return {
          ...stream,
          problems: problem || null,
          streamer: streamer ? {
            id: streamer.user_id,
            full_name: streamer.full_name,
            username: streamer.username,
            avatar_url: streamer.avatar_url,
          } : null,
        }
      })
      .filter((stream: any) => {
        // Filter by search
        if (search) {
          const problemMatch = stream.problems?.title?.toLowerCase().includes(search.toLowerCase())
          const streamerMatch = stream.streamer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                               stream.streamer?.username?.toLowerCase().includes(search.toLowerCase())
          if (!problemMatch && !streamerMatch) {
            return false
          }
        }

        // Filter by difficulty (already done in query, but double-check)
        if (difficulty && stream.problems?.difficulty !== difficulty) {
          return false
        }

        // Filter by tag
        if (tag) {
          const tags = stream.problems?.topic_tags || []
          const tagMatch = tags.some((t: any) => 
            t.slug === tag || 
            t.name?.toLowerCase().includes(tag.toLowerCase())
          )
          if (!tagMatch) {
            return false
          }
        }

        // Only include streams with valid problem data
        return stream.problems !== null
      })

    return NextResponse.json({ streams: enrichedStreams })
  } catch (error) {
    console.error('Error in live streams GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

