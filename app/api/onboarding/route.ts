import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { kind, code, major, age, academicYear } = body;

    if (!kind || !age || !academicYear) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (kind === "college" && !code) {
      return NextResponse.json(
        { error: "School code is required for college selection" },
        { status: 400 }
      );
    }

    // Update user profile with onboarding data
    const updateData: any = {
      age,
      academic_year: academicYear,
    };

    if (kind === "college") {
      updateData.federal_school_code = code;
      updateData.major = major;
    } else if (kind === "no_school") {
      updateData.federal_school_code = "no_school";
      if (major) {
        updateData.major = major;
      }
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      return NextResponse.json(
        { error: "Failed to save education information" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in onboarding API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

