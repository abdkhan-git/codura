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
    const { from_user_id } = await request.json();

    if (!from_user_id) {
      return NextResponse.json(
        { error: "from_user_id is required" },
        { status: 400 }
      );
    }

    // Get the connection request (where from_user_id sent to current user)
    const { data: connection, error: fetchError } = await supabase
      .from("connections")
      .select("*")
      .eq("from_user_id", from_user_id)
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: "Connection request not found" },
        { status: 404 }
      );
    }

    // Update the connection status to accepted
    const { data: updatedConnection, error: updateError } = await supabase
      .from("connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", connection.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error accepting connection:", updateError);
      return NextResponse.json(
        { error: "Failed to accept connection request" },
        { status: 500 }
      );
    }

    // Create notification for the user who sent the request
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: from_user_id,
        actor_id: user.id,
        type: "connection_accepted",
        notification_type: "connection_accepted",
        title: "Connection Request Accepted",
        message: "Your connection request was accepted",
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
      connection: updatedConnection,
      message: "Connection request accepted successfully",
    });
  } catch (error) {
    console.error("Unexpected error accepting connection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
