import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Get pending admission requests for a session
 * GET /api/mock-interview/sessions/admission?sessionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from("study_pod_sessions")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user is host
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: "Only host can view admission requests" }, { status: 403 });
    }

    // Get pending requests (stored in metadata)
    const pendingRequests = session.metadata?.pending_requests || [];

    // Get user details for each pending request
    if (pendingRequests.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", pendingRequests);

      return NextResponse.json({
        pendingRequests: users || [],
      });
    }

    return NextResponse.json({ pendingRequests: [] });
  } catch (error) {
    console.error("Error in GET /api/mock-interview/sessions/admission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Approve or deny admission to session
 * POST /api/mock-interview/sessions/admission
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, participantId, action } = body; // action: 'approve' | 'deny'

    if (!sessionId || !participantId || !action) {
      return NextResponse.json(
        { error: "Session ID, participant ID, and action are required" },
        { status: 400 }
      );
    }

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from("study_pod_sessions")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user is host
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: "Only host can approve/deny admission" }, { status: 403 });
    }

    const metadata = session.metadata || {};
    const pendingRequests = metadata.pending_requests || [];
    const approvedParticipants = metadata.approved_participants || [];

    if (action === "approve") {
      // Remove from pending and add to approved
      const updatedPending = pendingRequests.filter((id: string) => id !== participantId);
      const updatedApproved = [...approvedParticipants, participantId];

      const { error: updateError } = await supabase
        .from("study_pod_sessions")
        .update({
          metadata: {
            ...metadata,
            pending_requests: updatedPending,
            approved_participants: updatedApproved,
          },
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("Error approving participant:", updateError);
        return NextResponse.json(
          { error: "Failed to approve participant" },
          { status: 500 }
        );
      }

      // Add to session attendance
      await supabase.from("session_attendance").insert({
        session_id: session.id,
        user_id: participantId,
        joined_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Participant approved",
      });
    } else if (action === "deny") {
      // Remove from pending
      const updatedPending = pendingRequests.filter((id: string) => id !== participantId);

      const { error: updateError } = await supabase
        .from("study_pod_sessions")
        .update({
          metadata: {
            ...metadata,
            pending_requests: updatedPending,
          },
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("Error denying participant:", updateError);
        return NextResponse.json(
          { error: "Failed to deny participant" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Participant denied",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/sessions/admission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
