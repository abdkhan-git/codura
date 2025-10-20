import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const { to_user_id } = await request.json();

    if (!to_user_id) {
      return NextResponse.json(
        { error: "to_user_id is required" },
        { status: 400 }
      );
    }

    // Prevent self-connection
    if (to_user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot send connection request to yourself" },
        { status: 400 }
      );
    }

    // Check if connection already exists
    const { data: existingConnection, error: checkError } = await supabase
      .from("connections")
      .select("id, status")
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${to_user_id}),and(from_user_id.eq.${to_user_id},to_user_id.eq.${user.id})`
      )
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error checking existing connection:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing connection" },
        { status: 500 }
      );
    }

    if (existingConnection) {
      if (existingConnection.status === "accepted") {
        return NextResponse.json(
          { error: "Already connected" },
          { status: 400 }
        );
      }
      if (existingConnection.status === "pending") {
        return NextResponse.json(
          { error: "Connection request already pending" },
          { status: 400 }
        );
      }
      if (existingConnection.status === "blocked") {
        return NextResponse.json(
          { error: "Cannot send connection request" },
          { status: 403 }
        );
      }
    }

    // Create connection request
    const { data: connection, error: insertError } = await supabase
      .from("connections")
      .insert({
        from_user_id: user.id,
        to_user_id: to_user_id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating connection request:", insertError);
      return NextResponse.json(
        { error: "Failed to send connection request" },
        { status: 500 }
      );
    }

    // Create notification for the recipient
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: to_user_id,
        actor_id: user.id,
        type: "connection_request",
        notification_type: "connection_request",
        title: "New Connection Request",
        message: "You have a new connection request",
        link: `/network/connections`,
        metadata: {
          connection_id: connection.id,
        },
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      connection,
      message: "Connection request sent successfully",
    });
  } catch (error) {
    console.error("Unexpected error in connection request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}