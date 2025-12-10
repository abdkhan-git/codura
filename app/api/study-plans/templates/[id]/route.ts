import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from("study_plan_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get milestones
    const { data: milestones } = await supabase
      .from("study_plan_template_milestones")
      .select("*")
      .eq("template_id", id)
      .order("milestone_order", { ascending: true });

    return NextResponse.json({
      template: {
        ...template,
        milestones: milestones || [],
      },
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
