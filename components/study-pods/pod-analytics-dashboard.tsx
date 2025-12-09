"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Target,
  Calendar,
  Brain,
  Trophy,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PodAnalyticsDashboardProps {
  podId: string;
}

export function PodAnalyticsDashboard({ podId }: PodAnalyticsDashboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [podId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/study-pods/${podId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success("Analytics refreshed!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn(
        "text-center py-12 rounded-xl border-2",
        theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
      )}>
        <BarChart3 className={cn(
          "w-12 h-12 mx-auto mb-4",
          theme === "light" ? "text-gray-400" : "text-white/30"
        )} />
        <p className={cn(
          "text-lg font-medium",
          theme === "light" ? "text-gray-900" : "text-white"
        )}>
          No analytics available
        </p>
      </div>
    );
  }

  const { health, activity, performance, skills, schedule, readiness, recommendations } = analytics;

  // Prepare chart data
  const healthData = [
    {
      metric: "Engagement",
      score: health.engagement_rate || 0,
      fullMark: 100,
    },
    {
      metric: "Completion",
      score: health.completion_rate || 0,
      fullMark: 100,
    },
    {
      metric: "Consistency",
      score: health.consistency_score || 0,
      fullMark: 100,
    },
    {
      metric: "Collaboration",
      score: health.collaboration_score || 0,
      fullMark: 100,
    },
  ];

  // Difficulty distribution for pie chart
  const difficultyData = Object.entries(skills.difficulty_distribution || {}).map(
    ([difficulty, data]: [string, any]) => ({
      name: difficulty,
      value: data.attempted || 0,
      completed: data.completed || 0,
    })
  );

  const DIFFICULTY_COLORS = {
    Easy: "#10b981",
    Medium: "#f59e0b",
    Hard: "#ef4444",
  };

  // Get health score status
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "emerald", icon: Trophy };
    if (score >= 60) return { label: "Good", color: "cyan", icon: TrendingUp };
    if (score >= 40) return { label: "Fair", color: "amber", icon: Activity };
    return { label: "Needs Attention", color: "orange", icon: AlertCircle };
  };

  const healthStatus = getHealthStatus(health.health_score || 0);
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "text-2xl font-bold bg-gradient-to-r from-foreground via-emerald-400 to-cyan-400 bg-clip-text text-transparent"
          )}>
            Pod Analytics & Insights
          </h2>
          <p className={cn(
            "text-sm mt-1",
            theme === "light" ? "text-gray-600" : "text-muted-foreground"
          )}>
            AI-powered insights to optimize your learning journey
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className={cn(
            "border-emerald-500/30",
            theme === "light" ? "hover:bg-emerald-50" : "hover:bg-emerald-500/10"
          )}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Health Score Card - Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={cn(
          "relative p-8 border-2 backdrop-blur-xl overflow-hidden",
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10"
        )}>
          {/* Animated background */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.2),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.2),transparent_50%)]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
                  `from-${healthStatus.color}-500/20 to-${healthStatus.color}-600/20`,
                  `shadow-${healthStatus.color}-500/20`
                )}>
                  <HealthIcon className={cn(
                    "w-8 h-8",
                    `text-${healthStatus.color}-400`
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg font-semibold mb-1",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    Pod Health Score
                  </h3>
                  <Badge className={cn(
                    "text-xs",
                    `bg-${healthStatus.color}-500/10 text-${healthStatus.color}-400 border-${healthStatus.color}-500/30`
                  )}>
                    {healthStatus.label}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  `from-${healthStatus.color}-400 to-${healthStatus.color}-600`
                )}>
                  {health.health_score || 0}
                </div>
                <p className={cn(
                  "text-sm mt-1",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}>
                  out of 100
                </p>
              </div>
            </div>

            {/* Health Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={Users}
                label="Engagement"
                value={`${health.engagement_rate || 0}%`}
                color="cyan"
                theme={theme}
              />
              <MetricCard
                icon={Target}
                label="Completion"
                value={`${health.completion_rate || 0}%`}
                color="emerald"
                theme={theme}
              />
              <MetricCard
                icon={Calendar}
                label="Consistency"
                value={`${health.consistency_score || 0}%`}
                color="purple"
                theme={theme}
              />
              <MetricCard
                icon={Zap}
                label="Collaboration"
                value={`${health.collaboration_score || 0}%`}
                color="amber"
                theme={theme}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-zinc-950/80 border-white/10"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Activity Trend
                </h3>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}>
                  Last 21 days
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activity.trend || []}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#e5e7eb" : "#27272a"} />
                <XAxis
                  dataKey="date"
                  stroke={theme === "light" ? "#6b7280" : "#71717a"}
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke={theme === "light" ? "#6b7280" : "#71717a"} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#ffffff" : "#18181b",
                    border: theme === "light" ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
                <Area
                  type="monotone"
                  dataKey="completions"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorCompletions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Health Radar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-zinc-950/80 border-white/10"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Performance Radar
                </h3>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}>
                  Overall metrics breakdown
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={healthData}>
                <PolarGrid stroke={theme === "light" ? "#e5e7eb" : "#27272a"} />
                <PolarAngleAxis
                  dataKey="metric"
                  stroke={theme === "light" ? "#6b7280" : "#71717a"}
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke={theme === "light" ? "#6b7280" : "#71717a"}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Difficulty Distribution */}
        {difficultyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className={cn(
              "p-6 border-2 backdrop-blur-xl",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-950/80 border-white/10"
            )}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    Difficulty Distribution
                  </h3>
                  <p className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}>
                    Problems attempted by difficulty
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DIFFICULTY_COLORS[entry.name as keyof typeof DIFFICULTY_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "light" ? "#ffffff" : "#18181b",
                      border: theme === "light" ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* Skill Gaps & Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-zinc-950/80 border-white/10"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Skills Analysis
                </h3>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}>
                  Strengths and areas to improve
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Strengths */}
              {skills.strengths && skills.strengths.length > 0 && (
                <div>
                  <h4 className={cn(
                    "text-sm font-semibold mb-2 flex items-center gap-2",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Strengths
                  </h4>
                  <div className="space-y-2">
                    {skills.strengths.slice(0, 3).map((strength: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border backdrop-blur-sm",
                          theme === "light"
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-emerald-500/10 border-emerald-500/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-medium",
                            theme === "light" ? "text-gray-900" : "text-white"
                          )}>
                            {strength.topic}
                          </span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            {strength.success_rate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Gaps */}
              {skills.skill_gaps && skills.skill_gaps.length > 0 && (
                <div>
                  <h4 className={cn(
                    "text-sm font-semibold mb-2 flex items-center gap-2",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    Needs Practice
                  </h4>
                  <div className="space-y-2">
                    {skills.skill_gaps.slice(0, 3).map((gap: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border backdrop-blur-sm",
                          theme === "light"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-orange-500/10 border-orange-500/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-medium",
                            theme === "light" ? "text-gray-900" : "text-white"
                          )}>
                            {gap.topic}
                          </span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            {gap.success_rate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* AI Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className={cn(
            "p-6 border-2 backdrop-blur-xl",
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-zinc-950/80 border-white/10"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  AI-Powered Recommendations
                </h3>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}>
                  Personalized suggestions to improve your pod
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recommendations.map((rec: any, index: number) => (
                <RecommendationCard
                  key={index}
                  recommendation={rec}
                  theme={theme}
                  index={index}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: any;
  label: string;
  value: string;
  color: string;
  theme: string | undefined;
}

function MetricCard({ icon: Icon, label, value, color, theme }: MetricCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105",
      theme === "light"
        ? "bg-gray-50 border-gray-200 hover:shadow-md"
        : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
        <span className={cn(
          "text-xs font-medium",
          theme === "light" ? "text-gray-600" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </div>
      <div className={cn(
        "text-2xl font-bold",
        `text-${color}-400`
      )}>
        {value}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: any;
  theme: string | undefined;
  index: number;
}

function RecommendationCard({ recommendation, theme, index }: RecommendationCardProps) {
  const priorityConfig = {
    high: { color: "orange", icon: AlertCircle },
    medium: { color: "cyan", icon: Activity },
    low: { color: "gray", icon: CheckCircle2 },
  };

  const config = priorityConfig[recommendation.priority as keyof typeof priorityConfig] || priorityConfig.low;
  const PriorityIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] group cursor-pointer",
        theme === "light"
          ? "bg-gray-50 border-gray-200 hover:shadow-md"
          : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          `bg-${config.color}-500/10 border border-${config.color}-500/20`
        )}>
          <PriorityIcon className={cn("w-5 h-5", `text-${config.color}-400`)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              {recommendation.title}
            </h4>
            <Badge
              className={cn(
                "text-xs shrink-0",
                `bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/30`
              )}
            >
              {recommendation.priority}
            </Badge>
          </div>
          <p className={cn(
            "text-sm mb-2",
            theme === "light" ? "text-gray-600" : "text-muted-foreground"
          )}>
            {recommendation.detail}
          </p>
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1",
          theme === "light" ? "text-gray-400" : "text-white/40"
        )} />
      </div>
    </motion.div>
  );
}
