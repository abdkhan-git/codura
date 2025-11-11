import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Join an existing mock interview session
 * POST /api/mock-interview/sessions/join
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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find session by custom session_id in metadata
    const { data: session, error: sessionError } = await supabase
      .from("study_pod_sessions")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or invalid session ID" },
        { status: 404 }
      );
    }

    // Check if session has ended
    if (session.ended_at || session.status === 'completed') {
      return NextResponse.json(
        { error: "This session has already ended" },
        { status: 400 }
      );
    }

    // Check if user is already in session
    const { data: existingAttendance } = await supabase
      .from("session_attendance")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json(
        { error: "You are already in this session" },
        { status: 400 }
      );
    }

    // Check participant limit (max 2 for mock interviews)
    const { data: currentParticipants, error: participantError } = await supabase
      .from("session_attendance")
      .select("*")
      .eq("session_id", session.id)
      .is("left_at", null);

    if (participantError) {
      console.error("Error checking participants:", participantError);
    }

    const maxParticipants = session.metadata?.max_participants || 2;
    if (currentParticipants && currentParticipants.length >= maxParticipants) {
      return NextResponse.json(
        { error: "Session is full" },
        { status: 400 }
      );
    }

    // Add user to pending requests (waiting for host approval)
    const metadata = session.metadata || {};
    const pendingRequests = metadata.pending_requests || [];

    // Check if already pending
    if (pendingRequests.includes(user.id)) {
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Waiting for host approval",
      });
    }

    // Add to pending requests
    const { error: updateError } = await supabase
      .from("study_pod_sessions")
      .update({
        metadata: {
          ...metadata,
          pending_requests: [...pendingRequests, user.id],
        },
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("Error adding to pending requests:", updateError);
      return NextResponse.json(
        { error: "Failed to request admission" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("study_pod_activities").insert({
      pod_id: session.pod_id,
      user_id: user.id,
      activity_type: "session_join_requested",
      metadata: {
        session_id: session.id,
        custom_session_id: sessionId,
      },
    });

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Waiting for host approval",
      session: {
        id: session.id,
        sessionId: sessionId,
        hostId: session.host_user_id,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/sessions/join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
