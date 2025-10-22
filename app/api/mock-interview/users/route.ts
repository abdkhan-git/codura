import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Search for users to invite to mock interview
 * GET /api/mock-interview/users?search=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    let query = supabase
      .from("users")
      .select(
        `
        user_id,
        full_name,
        username,
        avatar_url,
        bio,
        university,
        job_title
      `
      )
      .neq("user_id", user.id) // Exclude current user
      .eq("is_public", true) // Only show public profiles
      .limit(limit);

    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`
      );
    }

    const { data: users, error: usersError } = await query.order("full_name", {
      ascending: true,
    });

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get connection status for each user
    const userIds = users?.map((u) => u.user_id) || [];

    const { data: connections } = await supabase
      .from("connections")
      .select("user_id, friend_id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.in.(${userIds.join(",")})),and(friend_id.eq.${user.id},user_id.in.(${userIds.join(",")}))`
      );

    // Map connection status to users
    const usersWithStatus = users?.map((u) => {
      const connection = connections?.find(
        (c) =>
          (c.user_id === user.id && c.friend_id === u.user_id) ||
          (c.friend_id === user.id && c.user_id === u.user_id)
      );

      return {
        ...u,
        connectionStatus: connection?.status || "none",
      };
    });

    return NextResponse.json({
      users: usersWithStatus || [],
    });
  } catch (error) {
    console.error("Error in GET /api/mock-interview/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
