"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Play,
  Plus,
  TrendingUp,
  Zap,
  MessageSquare,
  Bookmark,
  Code2,
  HelpCircle,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { PodSection } from "./pod-sidebar";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { Badge } from "@/components/ui/badge";
import { PodReputationCard } from "./pod-reputation-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PodOverviewProps {
  pod: any;
  sessions: any[];
  challenges: any[];
  onNavigate: (section: PodSection) => void;
  onStartSession: () => void;
  onCreateChallenge: () => void;
  onOpenDiscussion?: (problemId: string) => void;
}

// Helper to safely parse dates
const isValidDate = (dateString: any): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const safeFormatDistance = (dateString: any): string => {
  if (!isValidDate(dateString)) return "Date not set";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Date not set";
  }
};

// Chart colors
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export function PodOverview({
  pod,
  sessions,
  challenges,
  onNavigate,
  onStartSession,
  onCreateChallenge,
  onOpenDiscussion,
}: PodOverviewProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [problemsSolvedData, setProblemsSolvedData] = useState([
    { name: 'Mon', solved: 0 },
    { name: 'Tue', solved: 0 },
    { name: 'Wed', solved: 0 },
    { name: 'Thu', solved: 0 },
    { name: 'Fri', solved: 0 },
    { name: 'Sat', solved: 0 },
    { name: 'Sun', solved: 0 },
  ]);
  const [difficultyData, setDifficultyData] = useState([
    { name: 'Easy', value: 0, color: '#10b981' },
    { name: 'Medium', value: 0, color: '#f59e0b' },
    { name: 'Hard', value: 0, color: '#ef4444' },
  ]);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = pod?.user_role === "owner" || pod?.user_role === "moderator";

  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch recent discussions and bookmarks
  useEffect(() => {
    if (pod?.id) {
      fetchOverviewData();
    }
  }, [pod?.id]);

  const fetchOverviewData = async () => {
    setLoadingData(true);
    try {
      const [discussionsRes, bookmarksRes, statisticsRes] = await Promise.all([
        fetch(`/api/study-pods/${pod.id}/recent-discussions`),
        fetch(`/api/study-pods/${pod.id}/bookmarks`),
        fetch(`/api/study-pods/${pod.id}/statistics`),
      ]);

      if (discussionsRes.ok) {
        const data = await discussionsRes.json();
        setRecentDiscussions(data.discussions || []);
      }

      if (bookmarksRes.ok) {
        const data = await bookmarksRes.json();
        setBookmarks(data.bookmarks || []);
      }

      if (statisticsRes.ok) {
        const stats = await statisticsRes.json();
        if (stats.problemsSolvedThisWeek) {
          setProblemsSolvedData(stats.problemsSolvedThisWeek);
        }
        if (stats.difficultyBreakdown) {
          setDifficultyData(stats.difficultyBreakdown);
        }
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter upcoming sessions - exclude stale ones
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const upcomingSessions = sessions
    .filter(s => {
      if (!isValidDate(s.scheduled_at)) return false;
      const scheduledDate = new Date(s.scheduled_at);
      if (s.status === "in_progress") {
        return scheduledDate > twentyFourHoursAgo;
      }
      return scheduledDate > now && s.status !== "completed" && s.status !== "cancelled";
    })
    .slice(0, 3);

  // Filter active challenges - exclude expired and completed ones
  const activeChallenges = challenges
    .filter(c => {
      // Must be active or upcoming status
      if (c.status !== "active" && c.status !== "upcoming") return false;
      // Check if end_time exists and is not in the past
      if (c.end_time && isValidDate(c.end_time)) {
        return !isPast(new Date(c.end_time));
      }
      return true;
    })
    .slice(0, 3);

  // Calculate pod health/activity score
  const activityScore = Math.min(100, (pod?.members?.length || 0) * 15 + (sessions.length * 10) + (challenges.length * 20));

  // Chart data is now fetched from API and stored in state

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'solution': return <Code2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'question': return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'hint': return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      default: return <MessageSquare className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Hero Stats Bar - Bento-style with shine */}
      <div
        className={cn(
          "grid grid-cols-5 gap-px rounded-lg overflow-hidden transition-all duration-700",
          theme === "light" ? "bg-gray-200" : "bg-white/10",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {[
          { label: "Members", value: pod?.members?.length || 0, accent: "emerald" },
          { label: "Problems", value: pod?.total_problems || 0, accent: "blue" },
          { label: "Sessions", value: pod?.total_sessions || 0, accent: "purple" },
          { label: "Challenges", value: challenges.length, accent: "amber" },
          { label: "Activity", value: `${activityScore}%`, accent: "cyan" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "relative overflow-hidden shine-effect group cursor-default",
              "py-4 px-3 text-center transition-all duration-300",
              theme === "light"
                ? "bg-white hover:bg-gray-50"
                : "bg-zinc-900 hover:bg-zinc-800/80"
            )}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            {/* Accent top line */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
              stat.accent === "emerald" && "bg-emerald-500",
              stat.accent === "blue" && "bg-blue-500",
              stat.accent === "purple" && "bg-purple-500",
              stat.accent === "amber" && "bg-amber-500",
              stat.accent === "cyan" && "bg-cyan-500"
            )} />
            <p className={cn(
              "text-2xl font-bold tabular-nums tracking-tight",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              {stat.value}
            </p>
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-widest mt-1",
              theme === "light" ? "text-gray-400" : "text-white/40"
            )}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions - Admin Only */}
      {isAdmin && (
        <div
          className={cn(
            "grid grid-cols-2 gap-3 transition-all duration-700 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <button
            onClick={onStartSession}
            className={cn(
              "group relative overflow-hidden shine-effect backdrop-blur-md shadow-lg hover:shadow-xl",
              "flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-300",
              theme === "light"
                ? "bg-gradient-to-r from-emerald-50/80 to-cyan-50/80 hover:from-emerald-100/90 hover:to-cyan-100/90 border border-emerald-200/50"
                : "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30"
            )}
          >
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
            <div>
              <p className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Start Live Session
              </p>
              <p className={cn(
                "text-xs",
                theme === "light" ? "text-gray-500" : "text-white/50"
              )}>
                Real-time collaboration
              </p>
            </div>
            <ArrowRight className={cn(
              "w-5 h-5 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all",
              theme === "light" ? "text-emerald-600" : "text-emerald-400"
            )} />
          </button>

          <button
            onClick={onCreateChallenge}
            className={cn(
              "group relative overflow-hidden shine-effect backdrop-blur-md shadow-lg hover:shadow-xl",
              "flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-300",
              theme === "light"
                ? "bg-gradient-to-r from-amber-50/80 to-orange-50/80 hover:from-amber-100/90 hover:to-orange-100/90 border border-amber-200/50"
                : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30"
            )}
          >
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 group-hover:rotate-90 transition-all">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Create Challenge
              </p>
              <p className={cn(
                "text-xs",
                theme === "light" ? "text-gray-500" : "text-white/50"
              )}>
                Competitive problem sprint
              </p>
            </div>
            <ArrowRight className={cn(
              "w-5 h-5 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all",
              theme === "light" ? "text-amber-600" : "text-amber-400"
            )} />
          </button>
        </div>
      )}

      {/* Main Content Grid - Asymmetric Bento Layout */}
      <div
        className={cn(
          "grid grid-cols-12 gap-4 transition-all duration-700 delay-200",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Sessions Column - Spans 7 cols */}
        <div className={cn(
          "col-span-12 lg:col-span-7 relative overflow-hidden shine-effect rounded-xl",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                upcomingSessions.some(s => s.status === "in_progress")
                  ? "bg-emerald-500 animate-pulse"
                  : theme === "light" ? "bg-gray-300" : "bg-white/20"
              )} />
              <h3 className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Sessions
              </h3>
              {upcomingSessions.some(s => s.status === "in_progress") && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500 text-white">
                  Live
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate("live-sessions")}
              className={cn(
                "text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all",
                theme === "light" ? "text-gray-500 hover:text-gray-900" : "text-white/50 hover:text-white"
              )}
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Sessions List */}
          <div className="p-4 space-y-2">
            {upcomingSessions.length === 0 ? (
              <div className={cn(
                "py-12 text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <div className={cn(
                  "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center",
                  theme === "light" ? "bg-gray-100" : "bg-white/5"
                )}>
                  <Play className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">No upcoming sessions</p>
                <p className="text-xs mt-1 opacity-60">Schedule one to get started</p>
              </div>
            ) : (
              upcomingSessions.map((session, i) => (
                <div
                  key={session.id}
                  onClick={() => onNavigate("live-sessions")}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-md border shadow-md hover:shadow-lg",
                    session.status === "in_progress"
                      ? theme === "light"
                        ? "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/50"
                        : "bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-500/30"
                      : theme === "light"
                        ? "bg-white/60 hover:bg-white/80 border-gray-200/50"
                        : "bg-white/5 hover:bg-white/10 border-white/10"
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Time indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex flex-col items-center justify-center text-center shrink-0",
                    session.status === "in_progress"
                      ? "bg-emerald-500 text-white"
                      : theme === "light"
                        ? "bg-gray-200 text-gray-600"
                        : "bg-white/10 text-white/60"
                  )}>
                    {session.status === "in_progress" ? (
                      <Zap className="w-5 h-5" />
                    ) : (
                      <>
                        <span className="text-xs font-bold uppercase">
                          {isValidDate(session.scheduled_at)
                            ? format(new Date(session.scheduled_at), "MMM")
                            : "TBD"}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {isValidDate(session.scheduled_at)
                            ? format(new Date(session.scheduled_at), "d")
                            : "--"}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium truncate",
                      theme === "light" ? "text-gray-900" : "text-white"
                    )}>
                      {session.title}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      theme === "light" ? "text-gray-500" : "text-white/50"
                    )}>
                      {session.status === "in_progress" ? "Happening now" : safeFormatDistance(session.scheduled_at)}
                    </p>
                  </div>

                  <ArrowRight className={cn(
                    "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                    theme === "light" ? "text-gray-400" : "text-white/40"
                  )} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Spans 5 cols */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Challenges Card */}
          <div className={cn(
            "relative overflow-hidden shine-effect rounded-xl",
            theme === "light"
              ? "bg-white border border-gray-200"
              : "bg-zinc-900/50 border border-white/5"
          )}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
              <h3 className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Active Challenges
              </h3>
              <button
                onClick={() => onNavigate("challenges")}
                className={cn(
                  "text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all",
                  theme === "light" ? "text-gray-500 hover:text-gray-900" : "text-white/50 hover:text-white"
                )}
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {activeChallenges.length === 0 ? (
                <div className={cn(
                  "py-8 text-center",
                  theme === "light" ? "text-gray-400" : "text-white/30"
                )}>
                  <p className="text-sm">No active challenges</p>
                </div>
              ) : (
                activeChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    onClick={() => onNavigate("challenges")}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                      challenge.status === "active"
                        ? theme === "light"
                          ? "bg-amber-50 hover:bg-amber-100"
                          : "bg-amber-500/10 hover:bg-amber-500/15"
                        : theme === "light"
                          ? "bg-gray-50 hover:bg-gray-100"
                          : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        theme === "light" ? "text-gray-900" : "text-white"
                      )}>
                        {challenge.title}
                      </p>
                      <p className={cn(
                        "text-xs mt-0.5",
                        theme === "light" ? "text-gray-500" : "text-white/50"
                      )}>
                        {challenge.total_problems} problems
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded",
                      challenge.status === "active"
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                    )}>
                      {challenge.status === "active" ? "Active" : "Soon"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className={cn(
            "relative overflow-hidden shine-effect rounded-xl",
            theme === "light"
              ? "bg-white border border-gray-200"
              : "bg-zinc-900/50 border border-white/5"
          )}>
            <div className="px-5 py-4 border-b border-inherit">
              <h3 className={cn(
                "font-semibold flex items-center gap-2",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                <TrendingUp className="w-4 h-4" />
                Recent Activity
              </h3>
            </div>

            <div className="p-4">
              {pod?.recent_activities && pod.recent_activities.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className={cn(
                    "absolute left-3 top-3 bottom-3 w-px",
                    theme === "light" ? "bg-gray-200" : "bg-white/10"
                  )} />

                  <div className="space-y-4">
                    {pod.recent_activities.slice(0, 4).map((activity: any, i: number) => (
                      <div key={activity.id} className="relative flex items-start gap-4 pl-8">
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute left-1.5 top-1 w-3 h-3 rounded-full border-2",
                          i === 0
                            ? "bg-emerald-500 border-emerald-500"
                            : theme === "light"
                              ? "bg-white border-gray-300"
                              : "bg-zinc-900 border-white/20"
                        )} />

                        <DefaultAvatar
                          src={activity.users?.avatar_url}
                          name={activity.users?.full_name}
                          username={activity.users?.username}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            theme === "light" ? "text-gray-900" : "text-white"
                          )}>
                            {activity.title}
                          </p>
                          <p className={cn(
                            "text-xs",
                            theme === "light" ? "text-gray-400" : "text-white/40"
                          )}>
                            {safeFormatDistance(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "py-8 text-center",
                  theme === "light" ? "text-gray-400" : "text-white/30"
                )}>
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - Data Visualization */}
      <div
        className={cn(
          "grid grid-cols-12 gap-4 transition-all duration-700 delay-250",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Problems Solved Chart */}
        <div className={cn(
          "col-span-12 lg:col-span-8 relative overflow-hidden shine-effect rounded-xl",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5"
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <BarChart3 className={cn(
                "w-4 h-4",
                theme === "light" ? "text-blue-500" : "text-blue-400"
              )} />
              <h3 className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Problems Solved This Week
              </h3>
            </div>
          </div>
          <div className="p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={problemsSolvedData}>
                <defs>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === "light" ? '#6b7280' : '#9ca3af', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === "light" ? '#6b7280' : '#9ca3af', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? '#fff' : '#18181b',
                    border: theme === "light" ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="solved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className={cn(
          "col-span-12 lg:col-span-4 relative overflow-hidden shine-effect rounded-xl",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5"
        )}>
          <div className="px-5 py-4 border-b border-inherit">
            <h3 className={cn(
              "font-semibold",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              Difficulty Breakdown
            </h3>
          </div>
          <div className="p-4 h-48 flex items-center justify-center relative">
            {/* Ensure we always have 3 difficulties */}
            {difficultyData.length >= 3 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        difficultyData.reduce((sum, d) => sum + d.value, 0) > 0
                          ? difficultyData
                          : [{ name: "No data", value: 1, color: theme === "light" ? "#d1d5db" : "#4b5563" }]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(
                        difficultyData.reduce((sum, d) => sum + d.value, 0) > 0
                          ? difficultyData
                          : [{ name: "No data", value: 1, color: theme === "light" ? "#d1d5db" : "#4b5563" }]
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={entry.name === "No data" ? 0.25 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{
                        display: difficultyData.reduce((sum, d) => sum + d.value, 0) === 0 ? 'none' : 'block',
                      }}
                      contentStyle={{
                        backgroundColor: theme === "light" ? '#fff' : '#18181b',
                        border: theme === "light" ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {difficultyData.reduce((sum, d) => sum + d.value, 0) === 0 && (
                  <div className={cn(
                    "absolute text-xs",
                    theme === "light" ? "text-gray-500" : "text-white/50"
                  )}>
                    No solved problems yet
                  </div>
                )}
              </>
            ) : (
              <div className={cn(
                "text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <p className="text-sm">Loading...</p>
              </div>
            )}
          </div>
          {/* Legend - Always show all difficulties */}
          <div className="px-4 pb-4 flex justify-center gap-4 flex-wrap">
            {/* Always show all 3 difficulties */}
            {[
              { name: 'Easy', value: difficultyData.find(d => d.name === 'Easy')?.value || 0, color: '#10b981' },
              { name: 'Medium', value: difficultyData.find(d => d.name === 'Medium')?.value || 0, color: '#f59e0b' },
              { name: 'Hard', value: difficultyData.find(d => d.name === 'Hard')?.value || 0, color: '#ef4444' },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    item.value === 0 && "opacity-50"
                  )}
                  style={{ backgroundColor: item.color }}
                />
                <span className={cn(
                  "text-xs",
                  item.value === 0 && "opacity-60",
                  theme === "light" ? "text-gray-600" : "text-white/60"
                )}>
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reputation Card Row */}
      <div
        className={cn(
          "transition-all duration-700 delay-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <PodReputationCard podId={pod?.id} />
      </div>

      {/* Recent Discussions & Bookmarks Row */}
      <div
        className={cn(
          "grid grid-cols-12 gap-4 transition-all duration-700 delay-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Recent Discussions */}
        <div className={cn(
          "col-span-12 lg:col-span-7 relative overflow-hidden shine-effect rounded-xl",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5"
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <MessageSquare className={cn(
                "w-4 h-4",
                theme === "light" ? "text-purple-500" : "text-purple-400"
              )} />
              <h3 className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Recent Discussions
              </h3>
            </div>
            <button
              onClick={() => onNavigate("problems")}
              className={cn(
                "text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all",
                theme === "light" ? "text-gray-500 hover:text-gray-900" : "text-white/50 hover:text-white"
              )}
            >
              View problems <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {loadingData ? (
              <div className={cn(
                "py-8 text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <div className="animate-pulse">Loading discussions...</div>
              </div>
            ) : recentDiscussions.length === 0 ? (
              <div className={cn(
                "py-8 text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No discussions yet</p>
                <p className="text-xs mt-1 opacity-60">Start a discussion on any problem</p>
              </div>
            ) : (
              recentDiscussions.map((discussion) => (
                <div
                  key={discussion.id}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    theme === "light"
                      ? "hover:bg-gray-50"
                      : "hover:bg-white/5"
                  )}
                  onClick={() => {
                    if (discussion.thread?.problem_id && onOpenDiscussion) {
                      onOpenDiscussion(discussion.thread.problem_id);
                    } else {
                      onNavigate("problems");
                    }
                  }}
                >
                  <DefaultAvatar
                    src={discussion.user?.avatar_url}
                    name={discussion.user?.full_name}
                    username={discussion.user?.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        theme === "light" ? "text-gray-900" : "text-white"
                      )}>
                        {discussion.user?.full_name || discussion.user?.username || 'Anonymous'}
                      </span>
                      {getCommentTypeIcon(discussion.comment_type)}
                      {discussion.approach_title && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {discussion.approach_title}
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs line-clamp-2",
                      theme === "light" ? "text-gray-600" : "text-white/70"
                    )}>
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={cn(
                        "text-[10px]",
                        theme === "light" ? "text-gray-400" : "text-white/40"
                      )}>
                        {safeFormatDistance(discussion.created_at)}
                      </span>
                      {discussion.thread?.problem && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          discussion.thread.problem.difficulty === 'Easy'
                            ? "bg-emerald-500/10 text-emerald-500"
                            : discussion.thread.problem.difficulty === 'Medium'
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-500"
                        )}>
                          {discussion.thread.problem.title}
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] flex items-center gap-1",
                        theme === "light" ? "text-gray-400" : "text-white/40"
                      )}>
                        <TrendingUp className="w-3 h-3" />
                        {discussion.upvotes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bookmarked Discussions */}
        <div className={cn(
          "col-span-12 lg:col-span-5 relative overflow-hidden shine-effect rounded-xl",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5"
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <Bookmark className={cn(
                "w-4 h-4",
                theme === "light" ? "text-amber-500" : "text-amber-400"
              )} />
              <h3 className={cn(
                "font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}>
                Your Bookmarks
              </h3>
            </div>
          </div>

          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {loadingData ? (
              <div className={cn(
                "py-8 text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <div className="animate-pulse">Loading bookmarks...</div>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className={cn(
                "py-8 text-center",
                theme === "light" ? "text-gray-400" : "text-white/30"
              )}>
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bookmarks yet</p>
                <p className="text-xs mt-1 opacity-60">Save helpful discussions for later</p>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={cn(
                    "group p-3 rounded-lg cursor-pointer transition-colors",
                    theme === "light"
                      ? "hover:bg-amber-50"
                      : "hover:bg-amber-500/5"
                  )}
                  onClick={() => {
                    if (bookmark.comment?.thread?.problem_id && onOpenDiscussion) {
                      onOpenDiscussion(bookmark.comment.thread.problem_id);
                    } else {
                      onNavigate("problems");
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getCommentTypeIcon(bookmark.comment?.comment_type)}
                    <span className={cn(
                      "text-sm font-medium truncate",
                      theme === "light" ? "text-gray-900" : "text-white"
                    )}>
                      {bookmark.comment?.approach_title ||
                        (bookmark.comment?.comment_type === 'solution' ? 'Solution' : 'Discussion')}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs line-clamp-2 mb-2",
                    theme === "light" ? "text-gray-600" : "text-white/70"
                  )}>
                    {bookmark.comment?.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px]",
                      theme === "light" ? "text-gray-400" : "text-white/40"
                    )}>
                      by {bookmark.comment?.user?.full_name || bookmark.comment?.user?.username || 'Anonymous'}
                    </span>
                    {bookmark.note && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500"
                      )}>
                        Note added
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Members Row */}
      <div
        className={cn(
          "relative overflow-hidden shine-effect rounded-xl transition-all duration-700 delay-300",
          theme === "light"
            ? "bg-white border border-gray-200"
            : "bg-zinc-900/50 border border-white/5",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <h3 className={cn(
              "font-semibold",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              Pod Members
            </h3>

            {/* Stacked Avatars */}
            <div className="flex -space-x-2">
              {pod?.members?.slice(0, 6).map((member: any, index: number) => (
                <div
                  key={member.id}
                  className="relative hover:z-10 transition-transform hover:scale-110"
                  style={{ zIndex: 6 - index }}
                >
                  <DefaultAvatar
                    src={member.users?.avatar_url}
                    name={member.users?.full_name}
                    username={member.users?.username}
                    size="sm"
                    className={cn(
                      "ring-2",
                      theme === "light" ? "ring-white" : "ring-zinc-900"
                    )}
                  />
                </div>
              ))}
              {(pod?.members?.length || 0) > 6 && (
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2",
                  theme === "light"
                    ? "bg-gray-100 text-gray-600 ring-white"
                    : "bg-white/10 text-white/70 ring-zinc-900"
                )}>
                  +{pod.members.length - 6}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate("members")}
            className={cn(
              "text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all",
              theme === "light" ? "text-gray-500 hover:text-gray-900" : "text-white/50 hover:text-white"
            )}
          >
            View all {pod?.members?.length || 0} members <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
