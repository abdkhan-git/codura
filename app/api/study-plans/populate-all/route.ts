import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// This endpoint populates all study plan templates
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

    // Call the populate-problems endpoint for each template
    const templates = [
      "blind_75_essentials",
      "neetcode_150",
      "grind_75",
    ];

    const results = [];

    for (const templateName of templates) {
      try {
        const populateResponse = await fetch(
          `${request.nextUrl.origin}/api/study-plans/populate-problems`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("Cookie") || "",
            },
            body: JSON.stringify({ template_name: templateName }),
          }
        );

        if (populateResponse.ok) {
          const data = await populateResponse.json();
          results.push({ template: templateName, success: true, ...data });
        } else {
          const error = await populateResponse.json();
          results.push({ template: templateName, success: false, error: error.error });
        }
      } catch (error: any) {
        results.push({ template: templateName, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error in populate-all route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

