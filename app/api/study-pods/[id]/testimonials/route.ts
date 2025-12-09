import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is/was a member
    const { data: membership } = await supabase
      .from("study_pod_members")
      .select("*")
      .eq("pod_id", podId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Only pod members can leave testimonials" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rating, testimonial, would_recommend, skills_improved, is_public } =
      body;

    // Create testimonial
    const { data: testimonialData, error } = await supabase
      .from("study_pod_testimonials")
      .insert({
        pod_id: podId,
        user_id: user.id,
        rating,
        testimonial,
        would_recommend: would_recommend ?? true,
        skills_improved: skills_improved || [],
        is_public: is_public ?? true,
        is_approved: false, // Requires approval
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating testimonial:", error);
      return NextResponse.json(
        { error: "Failed to create testimonial" },
        { status: 500 }
      );
    }

    return NextResponse.json({ testimonial: testimonialData }, { status: 201 });
  } catch (error) {
    console.error("Error in testimonials route:", error);
    return NextResponse.json(
      { error: "Failed to create testimonial" },
      { status: 500 }
    );
  }
}
