import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Finalize attendance for an approved participant or host
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
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("study_pod_sessions")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const approved = session.metadata?.approved_participants || [];
    const isHost = session.host_user_id === user.id;
    const isApproved = Array.isArray(approved) && approved.includes(user.id);
    if (!isHost && !isApproved) {
      return NextResponse.json({ error: "Not approved" }, { status: 403 });
    }

    // Ensure not already present
    const { data: existing } = await supabase
      .from("session_attendance")
      .select("id")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from("session_attendance")
        .insert({ session_id: session.id, user_id: user.id, joined_at: new Date().toISOString() });
      if (insertError) {
        console.error("Error inserting attendance:", insertError);
        return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/sessions/attend:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

