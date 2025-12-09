import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Get all study plans for a pod
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

    // Verify user is a member
    const { data: membership } = await supabase
      .from("study_pod_members")
      .select("role")
      .eq("pod_id", podId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to view study plans" },
        { status: 403 }
      );
    }

    // Get all active/draft study plans for this pod (exclude abandoned)
    const { data: plans, error } = await supabase
      .from("study_plans")
      .select(
        `
        *,
        template:template_id(
          id,
          display_name,
          description,
          category,
          difficulty_level,
          icon,
          color
        )
      `
      )
      .eq("pod_id", podId)
      .in("status", ["draft", "active"])
      .neq("status", "abandoned")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching study plans:", error);
      return NextResponse.json(
        { error: "Failed to fetch study plans" },
        { status: 500 }
      );
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json({ plans: [] });
    }

    // Get milestones and progress for all plans
    const plansWithDetails = await Promise.all(
      plans.map(async (plan) => {
        // Get milestones - filter out duplicates by title and order
        const { data: allMilestones } = await supabase
          .from("study_plan_milestones")
          .select("*")
          .eq("plan_id", plan.id)
          .order("milestone_order", { ascending: true });

        // Remove duplicates - keep first occurrence of each unique title+order combination
        const seen = new Set<string>();
        const milestones = (allMilestones || []).filter((m) => {
          const key = `${m.title}-${m.milestone_order}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        // Get all unique problem IDs from all milestones
        const allProblemIds = new Set<number>();
        milestones.forEach((m) => {
          if (m.problem_ids && Array.isArray(m.problem_ids)) {
            m.problem_ids.forEach((id: number) => allProblemIds.add(id));
          }
        });

        // Fetch problem details for all problems
        let problemsMap = new Map<number, any>();
        if (allProblemIds.size > 0) {
          const { data: problems } = await supabase
            .from("problems")
            .select("id, leetcode_id, title, title_slug, difficulty, topic_tags, acceptance_rate")
            .in("id", Array.from(allProblemIds));

          if (problems) {
            problems.forEach((p) => problemsMap.set(p.id, p));
          }
        }

        // Get milestone progress for the pod
        const { data: progress } = await supabase
          .from("study_plan_milestone_progress")
          .select("*")
          .eq("pod_id", podId)
          .in(
            "milestone_id",
            milestones?.map((m) => m.id) || []
          );

        // Combine milestones with progress and problems
        const milestonesWithProgress = milestones?.map((milestone) => {
          const milestoneProgress = progress?.find(
            (p) => p.milestone_id === milestone.id
          );
          
          // Get problems for this milestone
          const milestoneProblems = (milestone.problem_ids || [])
            .map((id: number) => problemsMap.get(id))
            .filter(Boolean);

          return {
            ...milestone,
            progress: milestoneProgress || null,
            problems: milestoneProblems,
          };
        });

        // Calculate overall progress
        const totalMilestones = milestones?.length || 0;
        const completedMilestones =
          progress?.filter((p) => p.status === "completed").length || 0;
        const progressPercentage =
          totalMilestones > 0
            ? Math.round((completedMilestones / totalMilestones) * 100)
            : 0;

        return {
          ...plan,
          milestones: milestonesWithProgress || [],
          milestones_completed: completedMilestones,
          progress_percentage: progressPercentage,
        };
      })
    );

    return NextResponse.json({ plans: plansWithDetails });
  } catch (error) {
    console.error("Error in GET study plans route:", error);
    return NextResponse.json(
      { error: "Failed to fetch study plans" },
      { status: 500 }
    );
  }
}
