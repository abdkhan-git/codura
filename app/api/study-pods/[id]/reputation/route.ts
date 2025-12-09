import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podId } = await params;
    const supabase = await createClient();

    // Get pod basic info
    const { data: pod, error: podError } = await supabase
      .from("study_pods")
      .select("*")
      .eq("id", podId)
      .single();

    if (podError || !pod) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    // Get badges
    const { data: badges } = await supabase
      .from("study_pod_badges")
      .select("*")
      .eq("pod_id", podId)
      .eq("is_active", true)
      .order("earned_at", { ascending: false });

    // Get rankings
    const { data: rankings } = await supabase
      .from("study_pod_global_leaderboard")
      .select("*")
      .eq("pod_id", podId)
      .eq("period", "current")
      .order("category", { ascending: true });

    // Get testimonials
    const { data: testimonials } = await supabase
      .from("study_pod_testimonials")
      .select(
        `
        *,
        author:user_id(id, full_name, avatar_url, username)
      `
      )
      .eq("pod_id", podId)
      .eq("is_approved", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get alumni
    const { data: alumni } = await supabase
      .from("study_pod_alumni")
      .select(
        `
        *,
        user:user_id(id, full_name, avatar_url, username),
        company:current_company_id(id, name, logo_url)
      `
      )
      .eq("pod_id", podId)
      .eq("is_public", true)
      .order("is_featured", { ascending: false })
      .order("graduation_date", { ascending: false })
      .limit(20);

    // Get member count
    const { count: memberCount } = await supabase
      .from("study_pod_members")
      .select("*", { count: "exact", head: true })
      .eq("pod_id", podId)
      .eq("status", "active");

    // Get session stats
    const { data: sessions } = await supabase
      .from("study_pod_sessions")
      .select("id, status")
      .eq("pod_id", podId);

    const completedSessions =
      sessions?.filter((s) => s.status === "completed").length || 0;

    // Get problem stats
    const { data: problems } = await supabase
      .from("study_pod_problems")
      .select("id")
      .eq("pod_id", podId);

    const { count: completedProblems } = await supabase
      .from("study_pod_problem_completions")
      .select("*", { count: "exact", head: true })
      .in(
        "pod_problem_id",
        problems?.map((p) => p.id) || []
      );

    // Calculate overall rating from testimonials
    const avgRating =
      testimonials && testimonials.length > 0
        ? testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) /
          testimonials.length
        : 0;

    return NextResponse.json({
      pod: {
        id: pod.id,
        name: pod.name,
        description: pod.description,
        subject: pod.subject,
        skill_level: pod.skill_level,
        is_public: pod.is_public,
        created_at: pod.created_at,
      },
      stats: {
        member_count: memberCount || 0,
        completed_sessions: completedSessions,
        problems_solved: completedProblems || 0,
        total_problems: problems?.length || 0,
        average_rating: Math.round(avgRating * 10) / 10,
        testimonial_count: testimonials?.length || 0,
        alumni_count: alumni?.length || 0,
      },
      badges: badges || [],
      rankings: rankings || [],
      testimonials: testimonials || [],
      alumni: alumni || [],
    });
  } catch (error) {
    console.error("Error fetching reputation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reputation data" },
      { status: 500 }
    );
  }
}
