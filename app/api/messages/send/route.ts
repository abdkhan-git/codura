import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversation_id, content, message_type = "text", attachments, metadata } = await request.json();

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: "conversation_id and content are required" },
        { status: 400 }
      );
    }

    // Check if user is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Prepare message data
    const messageData: any = {
      conversation_id,
      sender_id: user.id,
      content,
      message_type,
    };

    // Add metadata if attachments exist
    if (attachments && attachments.length > 0) {
      messageData.metadata = {
        ...metadata,
        attachments,
      };
    } else if (metadata) {
      messageData.metadata = metadata;
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert(messageData)
      .select("*")
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        {
          error: "Failed to send message",
          details: messageError.message,
          code: messageError.code
        },
        { status: 500 }
      );
    }

    // Get sender data from users table
    const { data: sender } = await supabase
      .from("users")
      .select("user_id, full_name, username, avatar_url")
      .eq("user_id", user.id)
      .single();

    // Update conversation's last_message_at
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.length > 100 ? content.substring(0, 100) + "..." : content,
      })
      .eq("id", conversation_id);

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        sender: {
          user_id: user.id,
          full_name: sender?.full_name || 'Unknown',
          username: sender?.username || '',
          avatar_url: sender?.avatar_url || null
        }
      },
    });
  } catch (error) {
    console.error("Error in send message API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}