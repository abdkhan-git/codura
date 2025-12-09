import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type NumberLike = number | null | undefined;

const safePercent = (num: NumberLike, den: NumberLike) => {
  if (!num || !den || den === 0) return null;
  return Math.max(0, Math.min(100, Math.round((Number(num) / Number(den)) * 100)));
};

const calculateHealthScore = (
  engagement: NumberLike,
  completion: NumberLike,
  consistency: NumberLike,
  collaboration: NumberLike
) => {
  const parts = [
    (engagement ?? 0) * 0.3,
    (completion ?? 0) * 0.3,
    (consistency ?? 0) * 0.25,
    (collaboration ?? 0) * 0.15,
  ];
  return Math.round(parts.reduce((a, b) => a + b, 0));
};

const isoDay = (date: string | Date) =>
  new Date(date).toISOString().split("T")[0];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Base pod record for visibility checks
    const { data: pod, error: podError } = await supabase
      .from("study_pods")
      .select("*")
      .eq("id", podId)
      .single();

    if (podError || !pod) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("study_pod_members")
      .select("role")
      .eq("pod_id", podId)
      .eq("user_id", user?.id || "")
      .eq("status", "active")
      .maybeSingle();

    if (!pod.is_public && !membership) {
      return NextResponse.json(
        { error: "You must be a pod member to view analytics" },
        { status: 403 }
      );
    }

    const { data: members } = await supabase
      .from("study_pod_members")
      .select("user_id, last_active_at")
      .eq("pod_id", podId)
      .eq("status", "active");

    // Prefer precomputed analytics if available
    const { data: analyticsSnapshot } = await supabase
      .from("study_pod_analytics")
      .select("*")
      .eq("pod_id", podId)
      .order("analytics_date", { ascending: false })
      .order("period_type", { ascending: true })
      .maybeSingle();

    const { data: memberInsights } = await supabase
      .from("study_pod_member_insights")
      .select("*")
      .eq("pod_id", podId)
      .order("insight_date", { ascending: false })
      .limit(12);

    // Fallback live calculations if snapshot missing
    const { data: podProblems } = await supabase
      .from("study_pod_problems")
      .select("id");

    const podProblemIds = podProblems?.map((p) => p.id) ?? [];

    const { data: completions } = podProblemIds.length
      ? await supabase
          .from("study_pod_problem_completions")
          .select("id, pod_problem_id, user_id, completed_at, time_taken_minutes")
          .in("pod_problem_id", podProblemIds)
      : { data: [] as any[] };

    const { data: sessions } = await supabase
      .from("study_pod_sessions")
      .select("id, scheduled_at, status, duration_minutes, started_at")
      .eq("pod_id", podId);

    const sessionIds = sessions?.map((s) => s.id) ?? [];
    const { data: attendance } = sessionIds.length
      ? await supabase
          .from("study_pod_session_attendance")
          .select("session_id, user_id, duration_minutes, joined_at")
          .in("session_id", sessionIds)
      : { data: [] as any[] };

    const activeMemberIds = new Set<string>();
    completions?.forEach((c: any) => c.user_id && activeMemberIds.add(c.user_id));
    attendance?.forEach((a: any) => a.user_id && activeMemberIds.add(a.user_id));

    const engagementRate = safePercent(activeMemberIds.size, members?.length || 0);
    const completionRate = safePercent(
      completions?.length || 0,
      podProblems?.length || 0
    );
    const weeklySessions =
      sessions?.filter((s) => s.status === "in_progress" || s.status === "completed")
        ?.length || 0;
    const consistencyScore = Math.min(100, weeklySessions * 10);
    const avgAttendancePerSession =
      sessions && sessions.length > 0
        ? (attendance?.length || 0) / Math.max(1, sessions.length)
        : 0;
    const collaborationScore = Math.min(
      100,
      Math.round(
        (avgAttendancePerSession / Math.max(1, members?.length || 1)) * 120
      )
    );

    const healthScore = calculateHealthScore(
      analyticsSnapshot?.engagement_rate ?? engagementRate,
      analyticsSnapshot?.completion_rate ?? completionRate,
      analyticsSnapshot?.consistency_score ?? consistencyScore,
      analyticsSnapshot?.collaboration_score ?? collaborationScore
    );

    const completionsByDay = (completions || []).reduce<Record<string, number>>(
      (acc, item: any) => {
        const day = isoDay(item.completed_at || new Date());
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {}
    );

    const sessionsByDay = (sessions || []).reduce<Record<string, number>>(
      (acc, item: any) => {
        const day = isoDay(item.scheduled_at || new Date());
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {}
    );

    const activityTrend = Object.entries({
      ...sessionsByDay,
      ...completionsByDay,
    })
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date]) => ({
        date,
        sessions: sessionsByDay[date] || 0,
        completions: completionsByDay[date] || 0,
      }))
      .slice(-21);

    const recommendedSchedule =
      analyticsSnapshot?.optimal_schedule_times || {
        best_days: ["Tuesday", "Thursday"],
        best_times: ["19:00", "20:30"],
        timezone: "UTC",
      };

    const readiness = analyticsSnapshot?.interview_readiness || {
      overall_score: healthScore,
      confidence: analyticsSnapshot?.progress_forecast?.confidence ?? 0.65,
      focus_areas: ["Dynamic Programming", "Graphs"],
    };

    const recommendations =
      analyticsSnapshot?.ai_recommendations ||
      [
        {
          title: "Double down on consistency",
          detail: "Lock two recurring sessions this week to lift consistency.",
          priority: "high",
        },
        {
          title: "Skill gap focus",
          detail: "Revisit graph traversal with 3 medium problems as a pod.",
          priority: "medium",
        },
        {
          title: "Collaboration boost",
          detail: "Rotate driver/navigator roles in the next live session.",
          priority: "medium",
        },
      ];

    return NextResponse.json({
      podId,
      source: analyticsSnapshot ? "snapshot" : "live-fallback",
      health: {
        health_score: analyticsSnapshot?.health_score ?? healthScore,
        engagement_rate: analyticsSnapshot?.engagement_rate ?? engagementRate,
        completion_rate: analyticsSnapshot?.completion_rate ?? completionRate,
        consistency_score:
          analyticsSnapshot?.consistency_score ?? consistencyScore,
        collaboration_score:
          analyticsSnapshot?.collaboration_score ?? collaborationScore,
      },
      activity: {
        trend: activityTrend,
        sessions_held: analyticsSnapshot?.sessions_held ?? sessions?.length ?? 0,
        problems_completed:
          analyticsSnapshot?.problems_completed ?? completions?.length ?? 0,
        messages_sent: analyticsSnapshot?.messages_sent ?? null,
      },
      performance: {
        success_rate: analyticsSnapshot?.success_rate ?? null,
        average_problem_time_minutes:
          analyticsSnapshot?.average_problem_time_minutes ??
          (completions?.length
            ? Math.round(
                (completions.reduce(
                  (sum: number, c: any) => sum + (c.time_taken_minutes || 0),
                  0
                ) /
                  completions.length) *
                  10
              ) / 10
            : null),
      },
      skills: {
        topic_performance: analyticsSnapshot?.topic_performance ?? {},
        difficulty_distribution:
          analyticsSnapshot?.difficulty_distribution ?? {},
        skill_gaps: analyticsSnapshot?.skill_gaps ?? [],
        strengths: analyticsSnapshot?.strengths ?? [],
      },
      schedule: recommendedSchedule,
      readiness,
      recommendations,
      member_insights: memberInsights || [],
      comparisons: analyticsSnapshot?.similar_pods_comparison ?? [],
      progress_forecast: analyticsSnapshot?.progress_forecast ?? null,
    });
  } catch (error) {
    console.error("Error building pod analytics", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}

