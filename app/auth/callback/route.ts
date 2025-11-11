// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateUniqueUsername } from "@/lib/username-generator";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");

  console.log("=== AUTH CALLBACK START ===");
  console.log("Code present:", !!code);

  if (!code) {
    console.error("No code in callback");
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();

  // Exchange code for session
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    console.error("Exchange error:", exchangeErr);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error("User error:", userError);
    return NextResponse.redirect(`${origin}/login`);
  }

  console.log("User authenticated:", user.id, user.email);

  // Check if user row already exists in unified users table
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("user_id, federal_school_code, questionnaire_completed, username, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("Existing user:", existingUser);
  console.log("Check error:", checkError);

  let profile = existingUser;

  // If user doesn't exist, create them in unified users table
  // The trigger will automatically create user_stats entry
  if (!existingUser) {
    console.log("Creating new user row...");

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.user_name ||
      user.email?.split('@')[0] ||
      "User";

    const email = user.email || "";
    const provider = user.app_metadata?.provider || "email";

    // Generate unique username
    console.log("Generating username...");
    const username = await generateUniqueUsername(
      email,
      fullName,
      provider,
      user.user_metadata
    );
    console.log("Generated username:", username);

    // Create entry in unified users table
    // Trigger will automatically create user_stats
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        user_id: user.id,
        full_name: fullName,
        email: email,
        username: username,
        federal_school_code: null,
        questionnaire_completed: false,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select("user_id, federal_school_code, questionnaire_completed")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    } else {
      console.log("New user created:", newUser);
      console.log("User stats auto-created by trigger");
      profile = newUser;
    }
  } else if (existingUser && !existingUser.username) {
    // If existing user doesn't have a username, generate one
    console.log("Existing user without username, generating...");

    const provider = user.app_metadata?.provider || "email";
    const username = await generateUniqueUsername(
      user.email || "",
      existingUser.full_name,
      provider,
      user.user_metadata
    );

    console.log("Generated username for existing user:", username);

    // Update the user with the new username
    const { error: updateError } = await supabase
      .from("users")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating username:", updateError);
    } else {
      console.log("Username updated successfully");
    }
  }

  // Decide destination based on profile
  let dest = "/onboarding";
  
  if (profile) {
    console.log("Profile data:", {
      questionnaire_completed: profile.questionnaire_completed,
      federal_school_code: profile.federal_school_code,
    });

    if (profile.questionnaire_completed) {
      dest = "/dashboard";
    } else {
      const code = profile.federal_school_code;
      const hasCode = code !== null && code !== undefined && String(code).trim() !== "";
      
      if (hasCode) {
        dest = "/questionnaire";
      } else {
        dest = "/onboarding";
      }
    }
  }

  console.log("Redirecting to:", dest);
  console.log("=== AUTH CALLBACK END ===");

  // Handle different environments
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    return NextResponse.redirect(`${origin}${dest}`);
  }
  
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${dest}`);
  }
  
  return NextResponse.redirect(`${origin}${dest}`);

}

