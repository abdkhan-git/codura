import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Send a message in a mock interview session
 * POST /api/mock-interview/messages
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
    const { sessionId, content, messageType = "text", fileUrl, fileName } = body;

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: "Session ID and content are required" },
        { status: 400 }
      );
    }

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from("study_pod_sessions")
      .select("id")
      .contains("metadata", { session_id: sessionId })
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user is in session
    const { data: attendance } = await supabase
      .from("session_attendance")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!attendance) {
      return NextResponse.json(
        { error: "You are not in this session" },
        { status: 403 }
      );
    }

    // Create a conversation for this session if it doesn't exist
    // We'll use the session_id in metadata as the unique identifier
    const conversationName = `Mock Interview - ${sessionId}`;

    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .maybeSingle();

    if (!conversation) {
      // Create conversation (avoid referencing non-existent columns)
      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({
          name: conversationName,
          metadata: { session_id: sessionId },
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      conversation = newConv;

      // Best-effort: add user as participant if the table exists
      try {
        await supabase.from("conversation_participants").insert({
          conversation_id: conversation.id,
          user_id: user.id,
        });
      } catch (e) {
        console.warn("conversation_participants insert skipped:", e);
      }
    }

    // Send message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: content,
        metadata: {
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
        },
      })
      .select(
        `
        *,
        sender:sender_id (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `
      )
      .single();

    if (messageError) {
      console.error("Error sending message:", messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error("Error in POST /api/mock-interview/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get messages for a session
 * GET /api/mock-interview/messages?sessionId=xxx
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

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find conversation for this session
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .contains("metadata", { session_id: sessionId })
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:sender_id (
          user_id,
          full_name,
          username,
          avatar_url
        )
      `
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages || [],
    });
  } catch (error) {
    console.error("Error in GET /api/mock-interview/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
