"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Award,
  Crown,
  Medal,
  Flame,
  Star,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    total_challenges: number;
    completed_challenges: number;
    in_progress_challenges: number;
    total_points: number;
    total_problems_solved: number;
    total_problems_attempted: number;
    accuracy_rate: number;
    avg_points_per_challenge: number;
  };
  bonuses: {
    speed_bonus_total: number;
    efficiency_bonus_total: number;
    total_bonus: number;
  };
  rankings: {
    first_place_finishes: number;
    top_three_finishes: number;
    win_rate: number;
  };
  badges: {
    total: number;
    by_tier: Record<string, number>;
    by_category: Record<string, number>;
    recent: Array<{
      id: string;
      name: string;
      icon: string;
      tier: string;
      color: string;
      awarded_at: string;
    }>;
  };
  performance_by_type: Record<string, { count: number; wins: number; points: number }>;
  recent_challenges: Array<{
    challenge_id: string;
    title: string;
    type: string;
    points: number;
    rank: number | null;
    problems_solved: number;
    status: string;
    date: string;
  }>;
}

interface ChallengeAnalyticsProps {
  podId?: string;
  className?: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-orange-600 to-orange-400',
  silver: 'from-gray-400 to-gray-300',
  gold: 'from-amber-500 to-yellow-400',
  platinum: 'from-cyan-400 to-teal-300',
  diamond: 'from-purple-500 to-pink-400',
};

export function ChallengeAnalytics({ podId, className }: ChallengeAnalyticsProps) {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [podId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = '/api/study-pods/challenges/analytics';
      if (podId) {
        url += `?pod_id=${podId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn(
        "text-center py-12",
        theme === 'light' ? "text-gray-600" : "text-white/60",
        className
      )}>
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === 'light' ? "bg-emerald-50" : "bg-emerald-500/10"
              )}>
                <Trophy className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.overview.total_points}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Total Points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === 'light' ? "bg-blue-50" : "bg-blue-500/10"
              )}>
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.overview.total_problems_solved}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Problems Solved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === 'light' ? "bg-amber-50" : "bg-amber-500/10"
              )}>
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.rankings.first_place_finishes}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  First Place Wins
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === 'light' ? "bg-purple-50" : "bg-purple-500/10"
              )}>
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.badges.total}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Badges Earned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accuracy & Challenges */}
        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-base",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Accuracy Rate
                </span>
                <span className={cn("text-sm font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.overview.accuracy_rate}%
                </span>
              </div>
              <Progress value={analytics.overview.accuracy_rate} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Win Rate
                </span>
                <span className={cn("text-sm font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.rankings.win_rate}%
                </span>
              </div>
              <Progress value={analytics.rankings.win_rate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className={cn(
                "p-3 rounded-lg border text-center",
                theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              )}>
                <p className={cn("text-lg font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.overview.completed_challenges}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Completed
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg border text-center",
                theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              )}>
                <p className={cn("text-lg font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.overview.in_progress_challenges}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  In Progress
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg border text-center",
                theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              )}>
                <p className={cn("text-lg font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {analytics.rankings.top_three_finishes}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Top 3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Breakdown */}
        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-base",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              <Zap className="w-4 h-4 text-amber-500" />
              Bonus Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light' ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200" : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30"
            )}>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    +{analytics.bonuses.speed_bonus_total}
                  </p>
                  <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                    Speed Bonus Points
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light' ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200" : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30"
            )}>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-500">
                    +{analytics.bonuses.efficiency_bonus_total}
                  </p>
                  <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                    Efficiency Bonus Points
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-lg border text-center",
              theme === 'light' ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/30"
            )}>
              <p className="text-sm text-amber-500 mb-1">Total Bonus</p>
              <p className="text-2xl font-bold text-amber-500">
                +{analytics.bonuses.total_bonus}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Collection */}
      <Card className={cn(
        "border-2",
        theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
      )}>
        <CardHeader>
          <CardTitle className={cn(
            "flex items-center gap-2 text-base",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            <Medal className="w-4 h-4 text-amber-500" />
            Badge Collection
          </CardTitle>
          <CardDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
            {analytics.badges.total} badges earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(analytics.badges.by_tier).map(([tier, count]) => (
              <div
                key={tier}
                className={cn(
                  "p-3 rounded-lg border text-center",
                  theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center bg-gradient-to-br",
                  TIER_COLORS[tier] || 'from-gray-400 to-gray-300'
                )}>
                  <Star className="w-5 h-5 text-white" />
                </div>
                <p className={cn(
                  "text-lg font-bold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {count}
                </p>
                <p className={cn(
                  "text-xs capitalize",
                  theme === 'light' ? "text-gray-600" : "text-white/60"
                )}>
                  {tier}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Challenges */}
      {analytics.recent_challenges.length > 0 && (
        <Card className={cn(
          "border-2",
          theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-base",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              <Flame className="w-4 h-4 text-orange-500" />
              Recent Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recent_challenges.map((challenge) => (
                <div
                  key={challenge.challenge_id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {challenge.rank === 1 ? (
                      <Crown className="w-5 h-5 text-amber-500" />
                    ) : challenge.rank && challenge.rank <= 3 ? (
                      <Medal className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Trophy className="w-5 h-5 text-emerald-500" />
                    )}
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        theme === 'light' ? "text-gray-900" : "text-white"
                      )}>
                        {challenge.title}
                      </p>
                      <p className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-600" : "text-white/60"
                      )}>
                        {new Date(challenge.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize text-xs">
                      {challenge.type}
                    </Badge>
                    {challenge.rank && (
                      <Badge className={cn(
                        "text-xs",
                        challenge.rank === 1 ? "bg-amber-500" :
                        challenge.rank === 2 ? "bg-gray-400" :
                        challenge.rank === 3 ? "bg-orange-600" : ""
                      )}>
                        #{challenge.rank}
                      </Badge>
                    )}
                    <span className="text-emerald-500 font-semibold text-sm">
                      {challenge.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
