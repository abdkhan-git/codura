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

    // Get parameters from query params or request body
    const { searchParams } = new URL(request.url);
    const to_user_id = searchParams.get("to_user_id");
    const request_id = searchParams.get("request_id");
    
    let requestBody = null;
    try {
      requestBody = await request.json();
    } catch {
      // Ignore JSON parse errors
    }

    const final_to_user_id = to_user_id || requestBody?.to_user_id;
    const final_request_id = request_id || requestBody?.request_id;

    if (!final_to_user_id && !final_request_id) {
      return NextResponse.json(
        { error: "to_user_id or request_id is required" },
        { status: 400 }
      );
    }

    let connection;
    let fetchError;

    if (final_request_id) {
      // Cancel by request ID
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("id", final_request_id)
        .eq("from_user_id", user.id)
        .eq("status", "pending")
        .single();
      
      connection = data;
      fetchError = error;
    } else {
      // Cancel by to_user_id (legacy support)
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("from_user_id", user.id)
        .eq("to_user_id", final_to_user_id)
        .eq("status", "pending")
        .single();
      
      connection = data;
      fetchError = error;
    }

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

    // Delete related notifications using metadata
    const { error: notificationError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", connection.to_user_id)
      .eq("type", "connection_request")
      .filter("metadata->>connection_id", "eq", connection.id);

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