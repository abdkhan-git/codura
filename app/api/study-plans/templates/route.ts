import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");

    let query = supabase
      .from("study_plan_templates")
      .select(
        `
        *,
        milestones:study_plan_template_milestones(
          id,
          title,
          total_problems,
          estimated_hours
        )
      `
      )
      .eq("is_published", true)
      .order("usage_count", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error("Error in templates route:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      display_name,
      description,
      detailed_overview,
      category,
      difficulty_level,
      tags,
      estimated_weeks,
      estimated_hours,
      icon,
      color,
      milestones,
    } = body;

    // Create template
    const { data: template, error: templateError } = await supabase
      .from("study_plan_templates")
      .insert({
        name,
        display_name,
        description,
        detailed_overview,
        category,
        difficulty_level,
        tags: tags || [],
        estimated_weeks,
        estimated_hours,
        icon,
        color,
        created_by: user.id,
        is_official: false,
        is_published: false, // Needs approval
      })
      .select()
      .single();

    if (templateError) {
      console.error("Error creating template:", templateError);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    // Create milestones if provided
    if (milestones && milestones.length > 0) {
      const milestonesData = milestones.map((m: any, index: number) => ({
        template_id: template.id,
        title: m.title,
        description: m.description,
        learning_objectives: m.learning_objectives || [],
        milestone_order: index + 1,
        problem_ids: m.problem_ids || [],
        required_problems: m.required_problems,
        total_problems: m.problem_ids?.length || 0,
        recommended_resources: m.recommended_resources || [],
        estimated_hours: m.estimated_hours,
      }));

      await supabase.from("study_plan_template_milestones").insert(milestonesData);
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error in POST templates route:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
