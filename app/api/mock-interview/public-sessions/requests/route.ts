import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Create a join request for a public interview session
 * POST /api/mock-interview/public-sessions/requests
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

    // Fetch the session to validate it exists and is available
    const { data: session, error: sessionError } = await supabase
      .from("public_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if session is still available
    if (!session.is_available) {
      return NextResponse.json(
        { error: "Session is no longer available" },
        { status: 400 }
      );
    }

    // Check if session has expired
    if (new Date(session.end_time) <= new Date()) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 400 }
      );
    }

    // Check if user is the host (can't request to join own session)
    if (session.host_user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot request to join your own session" },
        { status: 400 }
      );
    }

    // Check if user already has a pending or approved request
    const { data: existingRequest } = await supabase
      .from("public_interview_join_requests")
      .select("*")
      .eq("session_id", sessionId)
      .eq("requester_id", user.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existingRequest) {
      // If already approved, return the existing request (allow rejoin after disconnect)
      if (existingRequest.status === "approved") {
        return NextResponse.json({
          success: true,
          request: {
            id: existingRequest.id,
            sessionId: existingRequest.session_id,
            requesterId: existingRequest.requester_id,
            status: existingRequest.status,
            createdAt: existingRequest.created_at,
          },
          alreadyApproved: true,
        });
      }

      // If pending, return error
      return NextResponse.json(
        { error: `You already have a pending request for this session` },
        { status: 409 }
      );
    }

    // Create the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from("public_interview_join_requests")
      .insert({
        session_id: sessionId,
        requester_id: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (requestError) {
      console.error("Error creating join request:", requestError);
      return NextResponse.json(
        { error: "Failed to create join request" },
        { status: 500 }
      );
    }

    // TODO: Send real-time notification to host (via WebSocket or Supabase Realtime)

    return NextResponse.json({
      success: true,
      request: {
        id: joinRequest.id,
        sessionId: joinRequest.session_id,
        requesterId: joinRequest.requester_id,
        status: joinRequest.status,
        createdAt: joinRequest.created_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/public-sessions/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get join requests for a session (for hosts) or get own requests (for requesters)
 * GET /api/mock-interview/public-sessions/requests?sessionId=xxx OR ?userId=me
 */
export async function GET(request: NextRequest) {
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
    const userId = searchParams.get("userId");

    if (sessionId) {
      // Fetch requests for a specific session (host only)
      const { data: session, error: sessionError } = await supabase
        .from("public_interview_sessions")
        .select("host_user_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Verify user is the host
      if (session.host_user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: requests, error: requestsError } = await supabase
        .from("public_interview_join_requests")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching join requests:", requestsError);
        return NextResponse.json(
          { error: "Failed to fetch join requests" },
          { status: 500 }
        );
      }

      // Fetch requester user data
      const requesterIds = [...new Set(requests.map((r) => r.requester_id))];
      const { data: requesters } = await supabase
        .from("users")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", requesterIds);

      const requesterMap = new Map(
        requesters?.map((u) => [u.user_id, u]) || []
      );

      return NextResponse.json({
        requests: requests.map((req) => {
          const requester = requesterMap.get(req.requester_id);
          return {
            id: req.id,
            sessionId: req.session_id,
            requesterId: req.requester_id,
            requesterName: requester?.full_name || 'Unknown',
            requesterUsername: requester?.username || 'unknown',
            requesterAvatar: requester?.avatar_url || '',
            status: req.status,
            createdAt: req.created_at,
          };
        }),
      });
    } else if (userId === "me") {
      // Fetch current user's own requests
      const { data: requests, error: requestsError } = await supabase
        .from("public_interview_join_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching user requests:", requestsError);
        return NextResponse.json(
          { error: "Failed to fetch requests" },
          { status: 500 }
        );
      }

      // Fetch session data
      const sessionIds = [...new Set(requests.map((r) => r.session_id))];
      const { data: sessions } = await supabase
        .from("public_interview_sessions")
        .select("id, title, description, end_time, is_available, host_user_id")
        .in("id", sessionIds);

      const sessionMap = new Map(
        sessions?.map((s) => [s.id, s]) || []
      );

      return NextResponse.json({
        requests: requests.map((req) => {
          const session = sessionMap.get(req.session_id);
          return {
            id: req.id,
            sessionId: req.session_id,
            sessionTitle: session?.title || 'Unknown',
            sessionDescription: session?.description || '',
            status: req.status,
            createdAt: req.created_at,
          };
        }),
      });
    } else {
      return NextResponse.json(
        { error: "Either sessionId or userId=me is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/mock-interview/public-sessions/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Update a join request (approve, deny, cancel)
 * PATCH /api/mock-interview/public-sessions/requests
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
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    // Fetch the request
    const { data: joinRequest, error: requestError } = await supabase
      .from("public_interview_join_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from("public_interview_sessions")
      .select("id, host_user_id, is_available, session_id")
      .eq("id", joinRequest.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify permissions based on action
    if (action === "approve" || action === "deny") {
      // Only host can approve or deny
      if (session.host_user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (action === "cancel") {
      // Only requester can cancel
      if (joinRequest.requester_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let newStatus: string;
    switch (action) {
      case "approve":
        newStatus = "approved";
        break;
      case "deny":
        newStatus = "denied";
        break;
      case "cancel":
        newStatus = "cancelled";
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("public_interview_join_requests")
      .update({ status: newStatus })
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating join request:", updateError);
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    // If approved, mark session as unavailable and set current participant
    // The session_id should already exist from when the host created the session
    const sessionCode = session.session_id;

    if (action === "approve") {
      // Verify session code exists
      if (!sessionCode) {
        return NextResponse.json(
          { error: "Session code not found" },
          { status: 500 }
        );
      }

      // NOTE: Don't mark session as unavailable yet - wait until participant actually connects
      // Just track the approved participant
      const { error: sessionUpdateError } = await supabase
        .from("public_interview_sessions")
        .update({
          current_participant_id: joinRequest.requester_id,
        })
        .eq("id", joinRequest.session_id);

      if (sessionUpdateError) {
        console.error("Error updating session participant:", sessionUpdateError);
      }

      // Ensure a corresponding mock interview session exists and mark the participant as approved
      const ensureMockInterviewSession = async () => {
        const { data: existingSession } = await supabase
          .from("study_pod_sessions")
          .select("*")
          .contains("metadata", { session_id: sessionCode })
          .maybeSingle();

        if (existingSession) {
          const metadata = existingSession.metadata || {};
          const approved = new Set<string>(metadata.approved_participants || []);
          approved.add(joinRequest.requester_id);
          const pending = (metadata.pending_requests || []).filter(
            (id: string) => id !== joinRequest.requester_id
          );

          const { data: updatedSession, error: updateError } = await supabase
            .from("study_pod_sessions")
            .update({
              metadata: {
                ...metadata,
                session_id: sessionCode,
                is_mock_interview: true,
                max_participants: metadata.max_participants || 2,
                approved_participants: Array.from(approved),
                pending_requests: pending,
              },
              status: existingSession.status === "completed" ? "in_progress" : existingSession.status || "in_progress",
            })
            .eq("id", existingSession.id)
            .select()
            .maybeSingle();

          return updatedSession || existingSession;
        }

        // Try to associate with any pod the user belongs to (if schema requires pod_id NOT NULL)
        let hostPodId: string | null = null;
        try {
          const { data: membership } = await supabase
            .from("study_pod_members")
            .select("pod_id")
            .eq("user_id", session.host_user_id)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          hostPodId = membership?.pod_id || null;
        } catch (e) {
          // Ignore and continue without pod
        }

        const nowIso = new Date().toISOString();
        const baseMeta = {
          session_id: sessionCode,
          is_mock_interview: true,
          max_participants: 2,
          pending_requests: [],
          approved_participants: [joinRequest.requester_id],
        } as const;

        const attemptInserts = async () => {
          let { data, error } = await supabase
            .from("study_pod_sessions")
            .insert({
              ...(hostPodId ? { pod_id: hostPodId } : {}),
              title: "Public Mock Interview",
              description: null,
              session_type: "mock_interview_public",
              scheduled_at: nowIso,
              started_at: nowIso,
              status: "in_progress",
              host_user_id: session.host_user_id,
              metadata: baseMeta,
            })
            .select()
            .single();
          if (!error) return { data, error } as const;

          ({ data, error } = await supabase
            .from("study_pod_sessions")
            .insert({
              ...(hostPodId ? { pod_id: hostPodId } : {}),
              session_type: "mock_interview_public",
              start_time: nowIso,
              host_user_id: session.host_user_id,
              metadata: baseMeta,
            })
            .select()
            .single());
          if (!error) return { data, error } as const;

          ({ data, error } = await supabase
            .from("study_pod_sessions")
            .insert({
              ...(hostPodId ? { pod_id: hostPodId } : {}),
              session_type: "mock_interview_public",
              host_user_id: session.host_user_id,
              metadata: baseMeta,
            })
            .select()
            .single());
          return { data, error } as const;
        };

        let { data: createdSession, error: createError } = await attemptInserts();

        // If insert failed and we have no pod_id, try creating a private pod as a holder
        if (createError && !hostPodId) {
          try {
            const { data: pod } = await supabase
              .from("study_pods")
              .insert({
                created_by: session.host_user_id,
                name: "Public Mock Interview Pod",
                description: "Auto-created to host public mock interview sessions",
                subject: "Mock Interviews",
                skill_level: "Mixed",
                max_members: 2,
                is_public: false,
                requires_approval: false,
                meeting_schedule: [],
                topics: [],
                status: "active",
                metadata: { kind: "mock_interview_pod", created_by_feature: "public_mock_interview" },
                color_scheme: "indigo",
                target_problems_count: 0,
              })
              .select()
              .single();

            if (pod?.id) {
              hostPodId = pod.id;
              ({ data: createdSession, error: createError } = await attemptInserts());
            }
          } catch (e) {
            console.error("Unexpected error while creating pod for public session:", e);
          }
        }

        if (createError) {
          throw createError;
        }

        return createdSession;
      };

      let mockSession = null;
      try {
        mockSession = await ensureMockInterviewSession();
      } catch (error) {
        console.error("Error ensuring mock interview session for public request:", error);
      }

      // Add attendance records for host and approved participant if session exists
      if (mockSession?.id) {
        const ensureAttendance = async (userId: string) => {
          const { data: existingAttendance } = await supabase
            .from("session_attendance")
            .select("id")
            .eq("session_id", mockSession.id)
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingAttendance) {
            await supabase
              .from("session_attendance")
              .insert({ session_id: mockSession.id, user_id: userId, joined_at: new Date().toISOString() });
          }
        };

        await ensureAttendance(session.host_user_id);
        await ensureAttendance(joinRequest.requester_id);
      }

      // Deny all other pending requests for this session
      const { error: denyOthersError } = await supabase
        .from("public_interview_join_requests")
        .update({ status: "denied" })
        .eq("session_id", joinRequest.session_id)
        .eq("status", "pending")
        .neq("id", requestId);

      if (denyOthersError) {
        console.error("Error denying other requests:", denyOthersError);
      }
    }

    return NextResponse.json({
      success: true,
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        sessionId: session.id,
        sessionCode: sessionCode,
      },
    });
  } catch (error) {
    console.error("Error in PATCH /api/mock-interview/public-sessions/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Delete a join request
 * DELETE /api/mock-interview/public-sessions/requests?requestId=xxx
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
    const requestId = searchParams.get("requestId");
    const sessionId = searchParams.get("sessionId");

    if (!requestId && !sessionId) {
      return NextResponse.json(
        { error: "Request ID or Session ID is required" },
        { status: 400 }
      );
    }

    // If sessionId provided, delete user's request for that session
    if (sessionId) {
      const { error: deleteError } = await supabase
        .from("public_interview_join_requests")
        .delete()
        .eq("session_id", sessionId)
        .eq("requester_id", user.id);

      if (deleteError) {
        console.error("Error deleting join request:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete request" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Otherwise, use requestId (original behavior)
    // Verify the request exists and user is the requester
    const { data: joinRequest, error: requestError } = await supabase
      .from("public_interview_join_requests")
      .select("requester_id")
      .eq("id", requestId)
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (joinRequest.requester_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from("public_interview_join_requests")
      .delete()
      .eq("id", requestId!);

    if (deleteError) {
      console.error("Error deleting join request:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/mock-interview/public-sessions/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
