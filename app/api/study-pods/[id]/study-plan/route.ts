import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Get pod's study plan
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
        { error: "You must be a member to view the study plan" },
        { status: 403 }
      );
    }

    // Get pod's active study plan
    const { data: plan, error } = await supabase
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching study plan:", error);
      return NextResponse.json(
        { error: "Failed to fetch study plan" },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json({ plan: null });
    }

    // Get milestones
    const { data: milestones } = await supabase
      .from("study_plan_milestones")
      .select("*")
      .eq("plan_id", plan.id)
      .order("milestone_order", { ascending: true });

    // Get milestone progress for the pod
    const { data: progress } = await supabase
      .from("study_plan_milestone_progress")
      .select("*")
      .eq("pod_id", podId)
      .in(
        "milestone_id",
        milestones?.map((m) => m.id) || []
      );

    // Combine milestones with progress
    const milestonesWithProgress = milestones?.map((milestone) => {
      const milestoneProgress = progress?.find(
        (p) => p.milestone_id === milestone.id
      );
      return {
        ...milestone,
        progress: milestoneProgress || null,
      };
    });

    return NextResponse.json({
      plan: {
        ...plan,
        milestones: milestonesWithProgress || [],
      },
    });
  } catch (error) {
    console.error("Error in GET study plan route:", error);
    return NextResponse.json(
      { error: "Failed to fetch study plan" },
      { status: 500 }
    );
  }
}

// Create or adopt a study plan for the pod
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podId } = await params;
    const supabase = await createClient();
    const body = await request.json();

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
        { error: "Only pod owners/moderators can set study plans" },
        { status: 403 }
      );
    }

    const { template_id, custom_goals, start_date, target_end_date } = body;

    // Prevent duplicate active/draft plans for the same template in this pod
    const { data: existingPlan } = await supabase
      .from("study_plans")
      .select("id, status")
      .eq("pod_id", podId)
      .eq("template_id", template_id)
      .in("status", ["draft", "active"])
      .maybeSingle();

    if (existingPlan) {
      return NextResponse.json(
        { error: "A study plan for this template already exists in this pod." },
        { status: 409 }
      );
    }

    // Get template
    const { data: template } = await supabase
      .from("study_plan_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Calculate target_end_date if not provided
    let calculatedTargetDate = target_end_date;
    if (!calculatedTargetDate && start_date && template.estimated_weeks) {
      const startDateObj = new Date(start_date);
      const targetDateObj = new Date(startDateObj);
      targetDateObj.setDate(startDateObj.getDate() + (template.estimated_weeks * 7));
      calculatedTargetDate = targetDateObj.toISOString().split("T")[0];
    }

    // Create study plan
    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        template_id,
        pod_id: podId,
        name: template.display_name,
        description: template.description,
        custom_goals,
        start_date,
        target_end_date: calculatedTargetDate,
        status: "active",
        milestones_total: 0, // Will update after creating milestones
        problems_total: 0,
      })
      .select()
      .single();

    if (planError) {
      console.error("Error creating study plan:", planError);
      return NextResponse.json(
        { error: "Failed to create study plan" },
        { status: 500 }
      );
    }

    // Get template milestones
    const { data: templateMilestones } = await supabase
      .from("study_plan_template_milestones")
      .select("*")
      .eq("template_id", template_id)
      .order("milestone_order", { ascending: true });

    // Create plan milestones from template
    if (templateMilestones && templateMilestones.length > 0) {
      const planMilestones = templateMilestones.map((tm) => ({
        plan_id: plan.id,
        template_milestone_id: tm.id,
        title: tm.title,
        description: tm.description,
        learning_objectives: tm.learning_objectives,
        milestone_order: tm.milestone_order,
        problem_ids: tm.problem_ids,
        required_problems: tm.required_problems,
        total_problems: tm.total_problems,
        recommended_resources: tm.recommended_resources,
        estimated_hours: tm.estimated_hours,
      }));

      const { data: createdMilestones } = await supabase
        .from("study_plan_milestones")
        .insert(planMilestones)
        .select();

      // Update plan with totals
      const totalProblems = planMilestones.reduce(
        (sum, m) => sum + (m.total_problems || 0),
        0
      );

      await supabase
        .from("study_plans")
        .update({
          milestones_total: planMilestones.length,
          problems_total: totalProblems,
        })
        .eq("id", plan.id);

      // Initialize progress tracking for the pod
      if (createdMilestones) {
        const progressRecords = createdMilestones.map((m) => ({
          milestone_id: m.id,
          pod_id: podId,
          progress_percentage: 0,
          problems_completed: 0,
          problems_total: m.total_problems || 0,
          status: "not_started",
        }));

        await supabase
          .from("study_plan_milestone_progress")
          .insert(progressRecords);
      }
    }

    // Increment template usage count
    await supabase.rpc("increment_template_usage", { template_id });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Error in POST study plan route:", error);
    return NextResponse.json(
      { error: "Failed to create study plan" },
      { status: 500 }
    );
  }
}
