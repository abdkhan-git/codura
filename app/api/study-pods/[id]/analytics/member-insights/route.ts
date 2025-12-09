import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a member or admin
    const { data: membership } = await supabase
      .from("study_pod_members")
      .select("role")
      .eq("pod_id", podId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to view member insights" },
        { status: 403 }
      );
    }

    // Only owners and moderators can see all member insights
    const isAdmin = membership.role === "owner" || membership.role === "moderator";

    // Get member insights
    let query = supabase
      .from("study_pod_member_insights")
      .select(
        `
        *,
        user:users(id, full_name, avatar_url, username)
      `
      )
      .eq("pod_id", podId)
      .order("performance_score", { ascending: false });

    // If not admin, only show their own insights
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: insights, error } = await query;

    if (error) {
      console.error("Error fetching member insights:", error);
      return NextResponse.json(
        { error: "Failed to fetch member insights" },
        { status: 500 }
      );
    }

    // Check if insights need regeneration
    const needsRegeneration = insights?.some(
      (insight: any) =>
        !insight.generated_at ||
        new Date(insight.generated_at).getTime() < Date.now() - 24 * 60 * 60 * 1000
    );

    if (needsRegeneration) {
      // Queue regeneration
      await supabase.from("study_pod_analytics_queue").insert({
        pod_id: podId,
        analytics_type: "member_insights",
        priority: "normal",
      });
    }

    return NextResponse.json({ insights: insights || [] });
  } catch (error) {
    console.error("Error in member insights route:", error);
    return NextResponse.json(
      { error: "Failed to fetch member insights" },
      { status: 500 }
    );
  }
}
