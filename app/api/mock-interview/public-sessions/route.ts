import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Create a new public interview session
 * POST /api/mock-interview/public-sessions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, endTime } = body;

    // Validate required fields
    if (!title || !endTime) {
      return NextResponse.json(
        { error: "Title and end time are required" },
        { status: 400 }
      );
    }

    // Validate end time is in the future
    const endTimeDate = new Date(endTime);
    if (endTimeDate <= new Date()) {
      return NextResponse.json(
        { error: "End time must be in the future" },
        { status: 400 }
      );
    }

    // Check if user already has an active public session
    const { data: existingSession } = await supabase
      .from("public_interview_sessions")
      .select("id")
      .eq("host_user_id", user.id)
      .eq("is_available", true)
      .gte("end_time", new Date().toISOString())
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json(
        { error: "You already have an active public session" },
        { status: 409 }
      );
    }

    // Generate a unique session code for WebRTC connections
    const sessionCode = `public-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the public session
    const { data: session, error: sessionError } = await supabase
      .from("public_interview_sessions")
      .insert({
        host_user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        end_time: endTimeDate.toISOString(),
        is_available: true,
        session_id: sessionCode,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating public session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create public session" },
        { status: 500 }
      );
    }

    // Fetch host user data separately
    const { data: hostUser } = await supabase
      .from("users")
      .select("user_id, full_name, username, avatar_url")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        endTime: session.end_time,
        hostUserId: session.host_user_id,
        hostName: hostUser?.full_name || 'Unknown',
        isAvailable: session.is_available,
        sessionCode: session.session_id,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/public-sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get all active public interview sessions
 * GET /api/mock-interview/public-sessions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (optional for viewing public sessions)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch all active public sessions that haven't expired
    const { data: sessions, error: sessionsError } = await supabase
      .from("public_interview_sessions")
      .select("*")
      .gte("end_time", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching public sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch public sessions" },
        { status: 500 }
      );
    }

    // Get all unique host user IDs
    const hostUserIds = [...new Set(sessions.map((s) => s.host_user_id))];

    // Fetch all host user data
    const { data: hostUsers } = await supabase
      .from("users")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", hostUserIds);

    const hostUserMap = new Map(
      hostUsers?.map((u) => [u.user_id, u]) || []
    );

    // For each session, check if the current user has a pending request
    let sessionsWithRequestStatus = sessions;
    if (user) {
      const sessionIds = sessions.map((s) => s.id);
      const { data: requests } = await supabase
        .from("public_interview_join_requests")
        .select("session_id, status")
        .eq("requester_id", user.id)
        .in("session_id", sessionIds);

      const requestMap = new Map(
        requests?.map((r) => [r.session_id, r.status]) || []
      );

      sessionsWithRequestStatus = sessions.map((session) => ({
        ...session,
        userRequestStatus: requestMap.get(session.id) || null,
      }));
    }

    return NextResponse.json({
      sessions: sessionsWithRequestStatus.map((session) => {
        const hostUser = hostUserMap.get(session.host_user_id);
        return {
          id: session.id,
          title: session.title,
          description: session.description,
          endTime: session.end_time,
          hostUserId: session.host_user_id,
          hostName: hostUser?.full_name || 'Unknown',
          hostUsername: hostUser?.username || 'unknown',
          hostAvatar: hostUser?.avatar_url || '',
          isAvailable: session.is_available,
          sessionId: session.session_id,
          currentParticipantId: session.current_participant_id,
          userRequestStatus: (session as any).userRequestStatus || null,
        };
      }),
    });
  } catch (error) {
    console.error("Error in GET /api/mock-interview/public-sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Update a public interview session (mark unavailable, end session, etc.)
 * PATCH /api/mock-interview/public-sessions
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, action, participantId } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "Session ID and action are required" },
        { status: 400 }
      );
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from("public_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user is the host
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let updateData: any = {};

    switch (action) {
      case "set_unavailable":
        updateData = {
          is_available: false,
          current_participant_id: participantId || null,
        };
        break;

      case "set_available":
        updateData = {
          is_available: true,
          current_participant_id: null,
        };
        break;

      case "end_session":
        updateData = {
          is_available: false,
          current_participant_id: null,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from("public_interview_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating public session:", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error in PATCH /api/mock-interview/public-sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Delete a public interview session
 * DELETE /api/mock-interview/public-sessions?sessionId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify the session exists and user is the host
    const { data: session, error: sessionError } = await supabase
      .from("public_interview_sessions")
      .select("host_user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the session (will cascade to join requests)
    const { error: deleteError } = await supabase
      .from("public_interview_sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      console.error("Error deleting public session:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/mock-interview/public-sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
