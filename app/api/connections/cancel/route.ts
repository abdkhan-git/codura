import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(request: Request) {
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

    // Get to_user_id from query params
    const { searchParams } = new URL(request.url);
    const to_user_id = searchParams.get("to_user_id");

    if (!to_user_id) {
      return NextResponse.json(
        { error: "to_user_id is required" },
        { status: 400 }
      );
    }

    // Get the connection request (where current user sent to to_user_id)
    const { data: connection, error: fetchError } = await supabase
      .from("connections")
      .select("*")
      .eq("from_user_id", user.id)
      .eq("to_user_id", to_user_id)
      .eq("status", "pending")
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: "Connection request not found" },
        { status: 404 }
      );
    }

    // Delete the connection request
    const { error: deleteError } = await supabase
      .from("connections")
      .delete()
      .eq("id", connection.id);

    if (deleteError) {
      console.error("Error canceling connection request:", deleteError);
      return NextResponse.json(
        { error: "Failed to cancel connection request" },
        { status: 500 }
      );
    }

    // Delete related notifications
    const { error: notificationError } = await supabase
      .from("notifications")
      .delete()
      .eq("related_entity_type", "connection")
      .eq("related_entity_id", connection.id);

    if (notificationError) {
      console.error("Error deleting notifications:", notificationError);
      // Don't fail the request if notification deletion fails
    }

    return NextResponse.json({
      success: true,
      message: "Connection request canceled",
    });
  } catch (error) {
    console.error("Unexpected error canceling connection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}