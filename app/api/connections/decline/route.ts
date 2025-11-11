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

    // Delete the connection request (instead of marking as rejected)
    const { error: deleteError } = await supabase
      .from("connections")
      .delete()
      .eq("id", connection.id);

    if (deleteError) {
      console.error("Error declining connection:", deleteError);
      return NextResponse.json(
        { error: "Failed to decline connection request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Connection request declined",
    });
  } catch (error) {
    console.error("Unexpected error declining connection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}