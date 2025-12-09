import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Delete a study plan (unenroll)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const { id: podId, planId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is owner or moderator
    const { data: membership } = await supabase
      .from("study_pod_members")
      .select("role")
      .eq("pod_id", podId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership || !["owner", "moderator"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only pod owners/moderators can delete study plans" },
        { status: 403 }
      );
    }

    // Verify the plan belongs to this pod
    const { data: plan } = await supabase
      .from("study_plans")
      .select("id")
      .eq("id", planId)
      .eq("pod_id", podId)
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: "Study plan not found or doesn't belong to this pod" },
        { status: 404 }
      );
    }

    // Set status to 'abandoned' instead of hard deleting
    // This ensures proper cleanup and prevents orphaned data
    const { error: deleteError } = await supabase
      .from("study_plans")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
      .eq("id", planId);

    if (deleteError) {
      console.error("Error deleting study plan:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete study plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE study plan route:", error);
    return NextResponse.json(
      { error: "Failed to delete study plan" },
      { status: 500 }
    );
  }
}
